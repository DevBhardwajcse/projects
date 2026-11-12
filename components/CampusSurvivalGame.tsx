'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  FICTIONAL_EQUIPMENT_ARSENAL,
  computeWeaponStats,
  ZOMBIE_CLASS_SPECS,
  ZombieClass,
  BOSS_SPECS,
  BossTier,
  getWaveDefinition,
  evaluateDynamicDifficulty,
  applyDamageWithArmor,
  PICKUP_CATALOG,
  PickupType,
  getCampusZoneName,
  resolveXZCollision,
  GraphicsQuality,
} from '@/lib/game/rules';
import { buildCampusEnvironment } from '@/lib/game/campusBuilder';
import {
  createSurvivorRig,
  createZombieRig,
  createBossRig,
  animateCharacterRig,
  CharacterRig,
} from '@/lib/game/characterModels';
import { soundEngine } from '@/lib/game/soundEngine';
import CampusMinimap, { MinimapEntity } from './CampusMinimap';
import TacticalAIModal from './TacticalAIModal';
import ArmoryInventoryModal, {
  InventoryItemEntry,
  AchievementEntry,
} from './ArmoryInventoryModal';

type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

interface ActiveEnemy {
  id: number;
  isBoss: boolean;
  bossTier?: BossTier;
  zombieClass: ZombieClass;
  name: string;
  rig: CharacterRig;
  x: number;
  z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseDamage: number;
  detectionRange: number;
  attackRange: number;
  attackWindup: number;
  attackCooldown: number;
  windupTimer: number;
  cooldownTimer: number;
  roamTargetX: number;
  roamTargetZ: number;
  roamIdleTimer: number;
  slowTimer: number;
  hitFlashTimer: number;
  koTimer: number; // > 0 when defeated & toppling
  xpReward: number;
  scrapReward: number;
}

interface ActiveSquadmate {
  id: number;
  name: string;
  role: string;
  rig: CharacterRig;
  x: number;
  z: number;
  rotY: number;
  hp: number;
  maxHp: number;
  isDowned: boolean;
  reviveProgress: number;
  shootCooldown: number;
  roamOffsetAngle: number;
}

interface ActivePickup {
  id: number;
  type: PickupType;
  weaponUnlockId?: string;
  mesh: THREE.Group;
  x: number;
  z: number;
  collected: boolean;
}

interface ActiveProjectile {
  active: boolean;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  rangeRemaining: number;
  effect: string;
  fromPlayer: boolean;
}

interface FloatingBanner {
  id: number;
  text: string;
  subtext?: string;
  color: string;
}

const SUIT_HEX_PAIRS = [
  { suit: 0x1e293b, vest: 0x334155 },
  { suit: 0x14532d, vest: 0x166534 },
  { suit: 0x1e3a8a, vest: 0x1d4ed8 },
  { suit: 0x3f1d1d, vest: 0x7f1d1d },
];

export default function CampusSurvivalGame() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Core Game Shell State
  const [shellState, setShellState] = useState<GameShellState>('title');
  const [gameMode, setGameMode] = useState<'single' | 'coop' | 'endless'>('single');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>('high');
  const [muted, setMuted] = useState<boolean>(false);
  const [minimapExpanded, setMinimapExpanded] = useState<boolean>(false);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [armoryModalOpen, setArmoryModalOpen] = useState<boolean>(false);
  const [armoryInitialTab, setArmoryInitialTab] = useState<
    'armory' | 'inventory' | 'lobby' | 'progression'
  >('armory');

  // HUD State (throttled updates so React never re-renders at 60Hz)
  const [hudState, setHudState] = useState({
    hp: 100,
    maxHp: 100,
    trailingHp: 100,
    armor: 75,
    maxArmor: 100,
    stamina: 100,
    wave: 1,
    waveTitle: 'Wave 1 · Initial Quadrangle Breach',
    enemiesRemaining: 9,
    prepCountdown: 0,
    scrap: 120,
    xp: 0,
    level: 1,
    currentZone: 'Central Flagpole Quadrangle & Badminton Court',
    equippedWeaponId: 'pulse_carbine',
    currentEnergy: 32,
    maxEnergy: 32,
    isRecharging: false,
    directorStatus: 'Balanced Pace',
    activeBossName: '',
    activeBossSubtitle: '',
    activeBossHp: 0,
    activeBossMaxHp: 1,
    nearbyPickupPrompt: '',
    isPlayerDowned: false,
    reviveProgress: 0,
    playerX: 0,
    playerZ: 38,
    playerRotY: 0,
    activeBuffs: [] as string[],
  });

  const [squadHud, setSquadHud] = useState<
    Array<{ id: number; name: string; role: string; hp: number; maxHp: number; isDowned: boolean }>
  >([]);

  const [minimapEntities, setMinimapEntities] = useState<MinimapEntity[]>([]);
  const [floatingBanner, setFloatingBanner] = useState<FloatingBanner | null>(null);

  // Persistent Player Progression & Inventory
  const [unlockedWeapons, setUnlockedWeapons] = useState<string[]>([
    'pulse_carbine',
    'scatter_prism',
  ]);
  const [weaponLevels, setWeaponLevels] = useState<Record<string, number>>({
    pulse_carbine: 1,
    scatter_prism: 1,
    scar_hyper_projector: 1,
    cryo_lance: 1,
    voltaic_arc: 1,
    titan_omega_launcher: 1,
  });
  const [inventory, setInventory] = useState<InventoryItemEntry[]>([
    {
      id: 'medkit_large',
      name: 'Large Field Medkit',
      rarity: 'rare',
      quantity: 2,
      description: 'Restores +75 HP immediately (Hotkey [H]).',
      actionType: 'heal_75',
    },
    {
      id: 'armor_plate',
      name: 'Composite Armor Cell',
      rarity: 'uncommon',
      quantity: 2,
      description: 'Restores +50 Tactical Armor.',
      actionType: 'armor_50',
    },
    {
      id: 'speed_injector',
      name: 'Overdrive Speed Injector',
      rarity: 'rare',
      quantity: 1,
      description: 'Grants +35% movement speed for 15 seconds.',
      actionType: 'speed_boost',
    },
    {
      id: 'energy_cell',
      name: 'Plasma Energy Pack',
      rarity: 'common',
      quantity: 2,
      description: 'Instantly refills weapon energy capacity.',
      actionType: 'energy_refill',
    },
  ]);

  // Co-op Room & Character Suit State
  const [roomCode, setRoomCode] = useState<string>('QUAD-108');
  const [isPublicRoom, setIsPublicRoom] = useState<boolean>(true);
  const [squadCount, setSquadCount] = useState<number>(3);
  const [selectedSuitIndex, setSelectedSuitIndex] = useState<number>(0);

  // Career Stats & End-of-Run Snapshot
  const [careerStats, setCareerStats] = useState({
    bestWave: 1,
    totalKills: 0,
    bossesDefeated: 0,
  });
  const [runSnapshot, setRunSnapshot] = useState({
    victory: false,
    finalWave: 1,
    kills: 0,
    bossesKilled: 0,
    scrapEarned: 0,
    xpEarned: 0,
    survivalSeconds: 0,
  });

  // Mutable Simulation Ref (decouples 60fps Three.js loop from React state)
  const simRef = useRef({
    state: 'title' as GameShellState,
    mode: 'single' as 'single' | 'coop' | 'endless',
    difficulty: 'normal' as DifficultyLevel,
    squadCount: 3,
    selectedSuitIndex: 0,
    // Player physics & combat
    px: 0,
    py: 0,
    pz: 38,
    vy: 0,
    rotY: 0,
    aimPitch: 0,
    isCrouching: false,
    isAimingZoom: false,
    hp: 100,
    maxHp: 100,
    trailingHp: 100,
    armor: 75,
    maxArmor: 100,
    stamina: 100,
    isDowned: false,
    reviveTimer: 0,
    scrap: 120,
    xp: 0,
    level: 1,
    equippedWeaponId: 'pulse_carbine',
    weaponLevels: {
      pulse_carbine: 1,
      scatter_prism: 1,
      scar_hyper_projector: 1,
      cryo_lance: 1,
      voltaic_arc: 1,
      titan_omega_launcher: 1,
    } as Record<string, number>,
     unlockedWeapons: ['pulse_carbine', 'scatter_prism'] as string[],
    currentEnergy: 32,
    maxEnergy: 32,
    rechargeTimer: 0,
    fireCooldown: 0,
    speedBuffTimer: 0,
    shieldBuffTimer: 0,
    doubleScrapTimer: 0,
    // Wave & Director
    wave: 1,
    waveEnemiesToSpawn: 9,
    waveEnemiesAlive: 0,
    prepTimer: 0,
    spawnTimer: 0,
    runKills: 0,
    runBossKills: 0,
    runScrapEarned: 0,
    runXpEarned: 0,
    runStartTime: 0,
    downedCountThisRun: 0,
    // Juice: Hitstop & Camera Shake
    hitstopTimer: 0,
    cameraTrauma: 0,
    footstepAccum: 0,
    // Trigger callbacks stored on ref
    startNewRun: (_overrideMode?: 'single' | 'coop' | 'endless') => {},
    summonBossNow: (_tier: BossTier) => {},
    applySuitColors: (_idx: number) => {},
  });

  // Sync body dataset state for Ultra Mode / Playwright verification
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
    simRef.current.state = shellState;
  }, [shellState]);

  // Load saved career progression from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('campus_last_stand_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bestWave) {
          setCareerStats({
            bestWave: parsed.bestWave || 1,
            totalKills: parsed.totalKills || 0,
            bossesDefeated: parsed.bossesDefeated || 0,
          });
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveProgress = useCallback((waveReached: number, killsDelta: number, bossDelta: number) => {
    setCareerStats((prev) => {
      const next = {
        bestWave: Math.max(prev.bestWave, waveReached),
        totalKills: prev.totalKills + killsDelta,
        bossesDefeated: prev.bossesDefeated + bossDelta,
      };
      try {
        localStorage.setItem('campus_last_stand_save_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const showBanner = useCallback((text: string, subtext?: string, color: string = '#f59e0b') => {
    const id = Date.now();
    setFloatingBanner({ id, text, subtext, color });
    setTimeout(() => {
      setFloatingBanner((cur) => (cur?.id === id ? null : cur));
    }, 3200);
  }, []);

  // Use medkit or inventory item
  const handleUseInventoryItem = useCallback(
    (itemId: string) => {
      const sim = simRef.current;
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id !== itemId || item.quantity <= 0) return item;
          if (item.actionType === 'heal_75') {
            sim.hp = Math.min(sim.maxHp, sim.hp + 75);
            sim.trailingHp = sim.hp;
            soundEngine.playPickup(false);
            showBanner('+75 HP RESTORED', 'Field Medkit Applied', '#10b981');
          } else if (item.actionType === 'armor_50') {
            sim.armor = Math.min(sim.maxArmor, sim.armor + 50);
            soundEngine.playPickup(false);
            showBanner('+50 ARMOR PLATING', 'Composite Cell Equipped', '#38bdf8');
          } else if (item.actionType === 'speed_boost') {
            sim.speedBuffTimer = 15;
            soundEngine.playPickup(true);
            showBanner('OVERDRIVE ENGAGED', '+35% Movement Speed (15s)', '#facc15');
          } else if (item.actionType === 'energy_refill') {
            sim.currentEnergy = sim.maxEnergy;
            sim.rechargeTimer = 0;
            soundEngine.playPickup(false);
            showBanner('ENERGY CELL RECHARGED', 'Full Weapon Capacity', '#22d3ee');
          }
          return { ...item, quantity: item.quantity - 1 };
        })
      );
    },
    [showBanner]
  );

  // Start Game Handler (Title -> Playing handshake)
  const handleStartGame = useCallback(
    (overrideMode?: 'single' | 'coop' | 'endless') => {
      if (typeof document !== 'undefined') {
        (document.activeElement as HTMLElement | null)?.blur?.();
        document.body.dataset.state = 'playing';
      }
      const targetMode = overrideMode || gameMode;
      if (overrideMode) setGameMode(overrideMode);
      simRef.current.mode = targetMode;
      simRef.current.difficulty = difficulty;
      simRef.current.squadCount = targetMode === 'coop' ? Math.max(2, squadCount) : squadCount;
      setAiModalOpen(false);
      setArmoryModalOpen(false);
      setShellState('playing');
      simRef.current.startNewRun(targetMode);
    },
    [gameMode, difficulty, squadCount]
  );

  // Check ?autostart=1 on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        handleStartGame('single');
      }
    }
  }, [handleStartGame]);

  // ============================================================================
  // MAIN THREE.JS SCENE & 60FPS SIMULATION LOOP (Mounted Once in useEffect)
  // ============================================================================
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection (per threejs skill)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    renderer.domElement.setAttribute('data-testid', 'campus-webgl-canvas');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyHorizonColor = new THREE.Color(0x94a3b8);
    scene.background = skyHorizonColor;
    scene.fog = new THREE.FogExp2(0x94a3b8, 0.0065);

    // Studio PBR Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.2,
      260
    );

    // 2. Balanced Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f4f3a, 0.85);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.65);
    sunLight.position.set(48, 72, 44);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const d = 68;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 180;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // 3. Build Exact 180m x 160m Campus 3D Environment from Visual Atlas PDF
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const campus = buildCampusEnvironment(maxAniso);
    scene.add(campus.group);

    // 4. Create Player Survivor Rig
    const playerRig = createSurvivorRig(0x1e293b, 0x334155, 0x38bdf8);
    playerRig.root.position.set(0, 0, 38);
    scene.add(playerRig.root);

    simRef.current.applySuitColors = (idx: number) => {
      const pair = SUIT_HEX_PAIRS[idx % SUIT_HEX_PAIRS.length];
      if (playerRig.primaryMaterials[0]) playerRig.primaryMaterials[0].color.setHex(pair.suit);
      if (playerRig.primaryMaterials[1]) playerRig.primaryMaterials[1].color.setHex(pair.vest);
    };

    // 5. Dynamic Entity Pools (Zombies, Bosses, Squadmates, Pickups, Projectiles, Particles)
    const enemiesGroup = new THREE.Group();
    scene.add(enemiesGroup);
    const squadGroup = new THREE.Group();
    scene.add(squadGroup);
    const pickupsGroup = new THREE.Group();
    scene.add(pickupsGroup);
    const projectilesGroup = new THREE.Group();
    scene.add(projectilesGroup);

    let activeEnemies: ActiveEnemy[] = [];
    let activeSquad: ActiveSquadmate[] = [];
    let activePickups: ActivePickup[] = [];
    let nextEntityId = 1;

    // Pre-allocated Projectile Pool (Zero-GC in animation loop)
    const PROJECTILE_POOL_SIZE = 40;
    const projGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const projectilePool: ActiveProjectile[] = [];
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      projectilesGroup.add(mesh);
      projectilePool.push({
        active: false,
        mesh,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        damage: 25,
        rangeRemaining: 0,
        effect: 'kinetic_pulse',
        fromPlayer: true,
      });
    }

    // Pre-allocated Particle Burst Pool (InstancedMesh ring buffer)
    const PARTICLE_COUNT = 120;
    const partGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInst = new THREE.InstancedMesh(partGeo, partMat, PARTICLE_COUNT);
    particleInst.frustumCulled = false;
    scene.add(particleInst);

    const particleData = Array.from({ length: PARTICLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.4,
      color: new THREE.Color(0xf97316),
    }));
    let particleCursor = 0;
    const _dummyObj = new THREE.Object3D();

    function spawnParticleBurst(x: number, y: number, z: number, colorHex: number, count = 12) {
      for (let i = 0; i < count; i++) {
        const p = particleData[particleCursor];
        particleCursor = (particleCursor + 1) % PARTICLE_COUNT;
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 6.5;
        p.vx = Math.cos(angle) * spd;
        p.vy = 1.5 + Math.random() * 4.5;
        p.vz = Math.sin(angle) * spd;
        p.life = 0.28 + Math.random() * 0.25;
        p.maxLife = p.life;
        p.color.setHex(colorHex);
        particleInst.setColorAt(particleCursor, p.color);
      }
      if (particleInst.instanceColor) particleInst.instanceColor.needsUpdate = true;
    }

    // Spawn Pickup / Mystery Supply Crate Mesh
    function spawnPickupAt(x: number, z: number, type: PickupType, weaponUnlockId?: string) {
      const spec = PICKUP_CATALOG[type];
      const meshGroup = new THREE.Group();
      meshGroup.position.set(x, 0, z);

      // Glowing Rarity Ring on ground
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.78, 20),
        new THREE.MeshBasicMaterial({
          color: spec.colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      meshGroup.add(ring);

      if (type === 'supply_crate') {
        // Military Supply Crate (matching Video 1 & 2 SCAR crate!)
        const crateBody = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.68, 0.75),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 })
        );
        crateBody.position.y = 0.36;
        crateBody.castShadow = true;
        meshGroup.add(crateBody);

        const crateTrim = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.14, 0.8),
          new THREE.MeshStandardMaterial({
            color: spec.colorHex,
            emissive: spec.colorHex,
            emissiveIntensity: 1.4,
          })
        );
        crateTrim.position.y = 0.62;
        meshGroup.add(crateTrim);
      } else {
        // Floating Supply Pod
        const pod = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.36, 0),
          new THREE.MeshStandardMaterial({
            color: spec.colorHex,
            emissive: spec.colorHex,
            emissiveIntensity: 0.85,
            roughness: 0.25,
            metalness: 0.5,
          })
        );
        pod.position.y = 0.65;
        meshGroup.add(pod);
      }

      pickupsGroup.add(meshGroup);
      activePickups.push({
        id: nextEntityId++,
        type,
        weaponUnlockId,
        mesh: meshGroup,
        x,
        z,
        collected: false,
      });
    }

    // Spawn Zombie at valid Campus location
    function spawnZombie(zombieClass: ZombieClass, customX?: number, customZ?: number) {
      const sim = simRef.current;
      const diffCfg = DIFFICULTY_PRESETS[sim.difficulty];
      const spec = ZOMBIE_CLASS_SPECS[zombieClass];

      const spawnPt =
        campus.zombieSpawnPoints[Math.floor(Math.random() * campus.zombieSpawnPoints.length)];
      const sx = customX !== undefined ? customX : spawnPt.x + (Math.random() - 0.5) * 8;
      const sz = customZ !== undefined ? customZ : spawnPt.z + (Math.random() - 0.5) * 8;

      const rig = createZombieRig(zombieClass, spec.scale);
      rig.root.position.set(sx, 0, sz);
      enemiesGroup.add(rig.root);

      const maxHp = Math.round(spec.baseHealth * diffCfg.enemyHealthMultiplier);
      const roamPt =
        campus.zombieSpawnPoints[Math.floor(Math.random() * campus.zombieSpawnPoints.length)];

      activeEnemies.push({
        id: nextEntityId++,
        isBoss: false,
        zombieClass,
        name: spec.name,
        rig,
        x: sx,
        z: sz,
        rotY: Math.random() * Math.PI * 2,
        hp: maxHp,
        maxHp,
        speed: spec.baseSpeed * diffCfg.enemySpeedMultiplier * (0.92 + Math.random() * 0.16),
        baseDamage: Math.round(spec.baseDamage * diffCfg.enemyDamageMultiplier),
        detectionRange: spec.detectionRange,
        attackRange: spec.attackRange,
        attackWindup: spec.attackWindup,
        attackCooldown: spec.attackCooldown,
        windupTimer: 0,
        cooldownTimer: 0,
        roamTargetX: roamPt.x,
        roamTargetZ: roamPt.z,
        roamIdleTimer: 0,
        slowTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        xpReward: spec.xpReward,
        scrapReward: spec.scrapReward,
      });
    }

    // Spawn Titan Boss (Tier 1, 2, or 3) in front of Academic Block B Monument
    function spawnBoss(tier: BossTier) {
      const sim = simRef.current;
      const diffCfg = DIFFICULTY_PRESETS[sim.difficulty];
      const bSpec = BOSS_SPECS[tier];

      // Spawn at Central Quadrangle in front of Block B Monument (0, 0, -18) matching Videos 1 & 2!
      const sx = 0;
      const sz = -17.5;
      const rig = createBossRig(tier, bSpec.scale);
      rig.root.position.set(sx, 0, sz);
      enemiesGroup.add(rig.root);

      const maxHp = Math.round(bSpec.baseHealth * diffCfg.bossHealthMultiplier);
      soundEngine.playBossRoar();
      sim.cameraTrauma = 0.65;
      showBanner(`WARNING: ${bSpec.name}`, bSpec.subtitle, '#ef4444');

      activeEnemies.push({
        id: nextEntityId++,
        isBoss: true,
        bossTier: tier,
        zombieClass: 'elite_mutant',
        name: bSpec.name,
        rig,
        x: sx,
        z: sz,
        rotY: 0,
        hp: maxHp,
        maxHp,
        speed: bSpec.baseSpeed,
        baseDamage: Math.round(bSpec.baseDamage * diffCfg.enemyDamageMultiplier),
        detectionRange: 95,
        attackRange: tier === 3 ? 5.2 : 3.8,
        attackWindup: 0.65,
        attackCooldown: 2.0,
        windupTimer: 0,
        cooldownTimer: 0,
        roamTargetX: 0,
        roamTargetZ: 10,
        roamIdleTimer: 0,
        slowTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        xpReward: bSpec.xpReward,
        scrapReward: bSpec.scrapReward,
      });
    }

    simRef.current.summonBossNow = (tier: BossTier) => {
      // Check if boss already alive
      const existingBoss = activeEnemies.find((e) => e.isBoss && e.koTimer === 0);
      if (existingBoss) return;
      spawnBoss(tier);
    };

    // Initialize or Reset Run
    function resetAndPopulateWorld() {
      const sim = simRef.current;
      // Clear previous enemies, squad, pickups
      activeEnemies.forEach((e) => enemiesGroup.remove(e.rig.root));
      activeEnemies = [];
      activeSquad.forEach((s) => squadGroup.remove(s.rig.root));
      activeSquad = [];
      activePickups.forEach((p) => pickupsGroup.remove(p.mesh));
      activePickups = [];

      // Reset Player at Main Avenue looking North toward Flagpole & Block B Monument
      sim.px = 0;
      sim.py = 0;
      sim.pz = 36;
      sim.vy = 0;
      sim.rotY = 0;
      sim.hp = 100;
      sim.maxHp = 100;
      sim.trailingHp = 100;
      sim.armor = 75;
      sim.maxArmor = 100;
      sim.stamina = 100;
      sim.isDowned = false;
      sim.reviveTimer = 0;
      sim.wave = 1;
      sim.runKills = 0;
      sim.runBossKills = 0;
      sim.runScrapEarned = 0;
      sim.runXpEarned = 0;
      sim.runStartTime = performance.now();
      sim.downedCountThisRun = 0;

      const eqSpec =
        FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === sim.equippedWeaponId) ||
        FICTIONAL_EQUIPMENT_ARSENAL[0];
      const wStats = computeWeaponStats(eqSpec, sim.weaponLevels[eqSpec.id] || 1);
      sim.currentEnergy = wStats.energyCapacity;
      sim.maxEnergy = wStats.energyCapacity;
      sim.rechargeTimer = 0;

      // Spawn Co-op Squadmates (based on squadCount)
      const companionProfiles = [
        { name: 'Kaelen', role: 'Squad Medic', suit: 0x14532d, vest: 0x166534, angle: -0.7 },
        { name: 'Vance', role: 'Heavy Suppressor', suit: 0x1e3a8a, vest: 0x1d4ed8, angle: 0.7 },
        { name: 'Mira', role: 'Recon Marksman', suit: 0x3f1d1d, vest: 0x7f1d1d, angle: 3.14 },
      ];
      const numCompanions = Math.max(0, Math.min(3, sim.squadCount - 1));
      for (let i = 0; i < numCompanions; i++) {
        const prof = companionProfiles[i];
        const rig = createSurvivorRig(prof.suit, prof.vest, 0x22c55e);
        const sx = sim.px + Math.cos(prof.angle) * 4.5;
        const sz = sim.pz + Math.sin(prof.angle) * 4.5;
        rig.root.position.set(sx, 0, sz);
        squadGroup.add(rig.root);
        activeSquad.push({
          id: nextEntityId++,
          name: prof.name,
          role: prof.role,
          rig,
          x: sx,
          z: sz,
          rotY: 0,
          hp: 100,
          maxHp: 100,
          isDowned: false,
          reviveProgress: 0,
          shootCooldown: 0.4 + i * 0.2,
          roamOffsetAngle: prof.angle,
        });
      }

      // Spawn Initial Campus Pickups & Mystery SCAR Supply Crate
      spawnPickupAt(3.5, 16, 'supply_crate', 'scar_hyper_projector');
      spawnPickupAt(-6, -12, 'health_medium');
      spawnPickupAt(13.5, -8, 'armor_medium');
      spawnPickupAt(0, -30, 'medkit_large'); // Inside Block B Table-Tennis Undercroft
      spawnPickupAt(-32, -12, 'energy_pack'); // Inside Block A Classroom Atrium
      spawnPickupAt(16, 20, 'boost_speed'); // Near Blue Chai Life Kiosk
      spawnPickupAt(-38, 26, 'armor_advanced'); // Sports Ground Amphitheater
      spawnPickupAt(24, -36, 'scrap_cache'); // Basement Ramp

      // Configure Wave 1
      const wDef = getWaveDefinition(1, sim.difficulty);
      sim.waveEnemiesToSpawn = Math.max(0, wDef.totalEnemies - 6);
      // Spawn initial 6 roaming zombies across the Campus Quadrangle & Avenues
      spawnZombie('walker', -6, 12);
      spawnZombie('walker', 5, 10);
      spawnZombie('runner', -14, -4);
      spawnZombie('walker', 16, -4);
      spawnZombie('armored', 0, -24);
      spawnZombie('screamer', -28, 18);
    }

    simRef.current.startNewRun = () => {
      resetAndPopulateWorld();
      soundEngine.playWaveHorn();
      showBanner('WAVE 1 · CAMPUS OUTBREAK', 'Eliminate Roaming Hostiles & Secure Supply Crates', '#f59e0b');
    };

    // Populate ambient world on mount for Title Screen Live Camera Tour
    resetAndPopulateWorld();

    // Pre-warm shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ========================================================================
    // UNIFIED KEYBOARD & POINTER INPUT HUB
    // ========================================================================
    const keysHeld = new Set<string>();
    let mouseDown = false;
    let pointerNormX = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const code = e.code;
      const wasHeld = keysHeld.has(code);
      keysHeld.add(code);

      const sim = simRef.current;

      // Title screen Enter/Space start handshake
      if (sim.state === 'title' && (code === 'Enter' || code === 'Space') && !wasHeld) {
        e.preventDefault();
        handleStartGame();
        return;
      }

      if (wasHeld) return; // Edge-triggered actions below

      // Pause toggle (Esc or P)
      if (code === 'Escape' || code === 'KeyP') {
        if (sim.state === 'playing') {
          setShellState('paused');
        } else if (sim.state === 'paused') {
          setShellState('playing');
        }
        return;
      }

      if (sim.state !== 'playing') return;

      // Jump (Space)
      if (code === 'Space' && sim.py <= 0.01 && !sim.isDowned) {
        sim.vy = 6.8;
      }
      // Crouch toggle (Ctrl / KeyC)
      if (code === 'ControlLeft' || code === 'KeyC') {
        sim.isCrouching = !sim.isCrouching;
      }
      // Recharge weapon (KeyR)
      if (code === 'KeyR' && sim.rechargeTimer <= 0 && sim.currentEnergy < sim.maxEnergy) {
        const eqSpec =
          FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === sim.equippedWeaponId) ||
          FICTIONAL_EQUIPMENT_ARSENAL[0];
        const stats = computeWeaponStats(eqSpec, sim.weaponLevels[eqSpec.id] || 1);
        sim.rechargeTimer = stats.rechargeTime;
      }
      // Quick Medkit Heal (KeyH)
      if (code === 'KeyH') {
        handleUseInventoryItem('medkit_large');
      }
      // Toggle Minimap Expand (KeyM)
      if (code === 'KeyM') {
        setMinimapExpanded((v) => !v);
      }
      // Open Armory / Upgrade Station (KeyU or Tab)
      if (code === 'KeyU' || code === 'Tab') {
        e.preventDefault();
        setArmoryInitialTab('armory');
        setArmoryModalOpen((v) => !v);
      }
      // Open Tactical AI Hub (KeyT)
      if (code === 'KeyT') {
        setAiModalOpen((v) => !v);
      }
      // Summon Titan Boss (KeyB - instant showcase / boss challenge)
      if (code === 'KeyB') {
        sim.summonBossNow(3);
      }
      // Quick Weapon Switch (Digit1 - Digit6)
      const digitMatch = code.match(/^Digit([1-6])$/);
      if (digitMatch) {
        const idx = parseInt(digitMatch[1], 10) - 1;
        const wSpec = FICTIONAL_EQUIPMENT_ARSENAL[idx];
        if (wSpec && sim.unlockedWeapons.includes(wSpec.id)) {
          sim.equippedWeaponId = wSpec.id;
          const st = computeWeaponStats(wSpec, sim.weaponLevels[wSpec.id] || 1);
          sim.maxEnergy = st.energyCapacity;
          sim.currentEnergy = st.energyCapacity;
          sim.rechargeTimer = 0;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
      if (e.code === 'Space' && simRef.current.vy > 0) {
        simRef.current.vy *= 0.45; // Variable jump cut
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0) {
        pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      }
      if (simRef.current.state === 'playing' && e.buttons === 2) {
        simRef.current.rotY -= e.movementX * 0.0045;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      if (e.button === 0) mouseDown = true;
      if (e.button === 2) simRef.current.isAimingZoom = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseDown = false;
      if (e.button === 2) simRef.current.isAimingZoom = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === renderer.domElement) e.preventDefault();
    };

    const onWindowBlur = () => {
      keysHeld.clear();
      mouseDown = false;
      simRef.current.isAimingZoom = false;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);

    // Helper: Fire Projectile
    function fireWeaponProjectile(
      originX: number,
      originY: number,
      originZ: number,
      angleY: number,
      specId: string,
      level: number,
      fromPlayer: boolean
    ) {
      const spec =
        FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === specId) ||
        FICTIONAL_EQUIPMENT_ARSENAL[0];
      const stats = computeWeaponStats(spec, level);

      for (let s = 0; s < spec.projectilesPerShot; s++) {
        const proj = projectilePool.find((p) => !p.active);
        if (!proj) break;

        const spread = (Math.random() - 0.5) * spec.spreadAngle;
        const shotAngle = angleY + spread;
        proj.active = true;
        proj.x = originX - Math.sin(shotAngle) * 0.6;
        proj.y = originY;
        proj.z = originZ - Math.cos(shotAngle) * 0.6;
        proj.vx = -Math.sin(shotAngle) * spec.projectileSpeed;
        proj.vy = 0;
        proj.vz = -Math.cos(shotAngle) * spec.projectileSpeed;
        proj.damage = stats.damage;
        proj.rangeRemaining = spec.baseRange;
        proj.effect = spec.elementalEffect;
        proj.fromPlayer = fromPlayer;

        (proj.mesh.material as THREE.MeshBasicMaterial).color.setHex(spec.projectileColor);
        proj.mesh.position.set(proj.x, proj.y, proj.z);
        proj.mesh.visible = true;
      }

      if (fromPlayer) {
        soundEngine.playShoot(spec.elementalEffect);
      }
    }

    // ========================================================================
    // ANIMATION & SIMULATION LOOP (with Software-WebGL afterDraw Pacing)
    // ========================================================================
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let hudUpdateAccum = 0;
    const _camTarget = new THREE.Vector3();
    const _camDesired = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05); // Clamped dt
      const elapsed = clock.getElapsedTime();
      const sim = simRef.current;

      // Wave flag on Central Flagpole Plaza
      if (campus.flagMesh) {
        campus.flagMesh.rotation.y = Math.sin(elapsed * 3.0) * 0.16;
      }

      // ----------------------------------------------------------------------
      // STATE 1: TITLE SCREEN LIVE WORLD CAMERA TOUR
      // ----------------------------------------------------------------------
      if (sim.state === 'title') {
        const orbitAngle = elapsed * 0.14;
        const camX = Math.sin(orbitAngle) * 36;
        const camZ = 18 + Math.cos(orbitAngle) * 28;
        camera.position.set(camX, 14.5 + Math.sin(elapsed * 0.4) * 2.5, camZ);
        camera.lookAt(0, 5.5, -22);

        // Gently roam ambient zombies & squadmates during Title Screen flyover
        for (let i = 0; i < activeEnemies.length; i++) {
          const e = activeEnemies[i];
          const dx = e.roamTargetX - e.x;
          const dz = e.roamTargetZ - e.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 2.0) {
            const nextPt =
              campus.zombieSpawnPoints[
                Math.floor(Math.random() * campus.zombieSpawnPoints.length)
              ];
            e.roamTargetX = nextPt.x;
            e.roamTargetZ = nextPt.z;
          } else {
            e.rotY = Math.atan2(-dx, -dz);
            e.x += (dx / dist) * 2.0 * dt;
            e.z += (dz / dist) * 2.0 * dt;
            const col = resolveXZCollision(e.x, e.z, 0.6, campus.colliders);
            e.x = col.x;
            e.z = col.z;
          }
          e.rig.root.position.set(e.x, 0, e.z);
          e.rig.root.rotation.y = e.rotY;
          animateCharacterRig(e.rig, 2.0, dt, elapsed, false, false, 0);
        }
      }

      // ----------------------------------------------------------------------
      // STATE 2: ACTIVE GAMEPLAY SIMULATION
      // ----------------------------------------------------------------------
      else if (sim.state === 'playing') {
        // Hitstop freeze check
        let simDt = dt;
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
          simDt = dt * 0.12;
        }

        // Decay buff timers
        if (sim.speedBuffTimer > 0) sim.speedBuffTimer = Math.max(0, sim.speedBuffTimer - dt);
        if (sim.shieldBuffTimer > 0) sim.shieldBuffTimer = Math.max(0, sim.shieldBuffTimer - dt);
        if (sim.doubleScrapTimer > 0)
          sim.doubleScrapTimer = Math.max(0, sim.doubleScrapTimer - dt);

        // Trailing damage bar smooth decay
        sim.trailingHp = THREE.MathUtils.damp(sim.trailingHp, sim.hp, 3.5, dt);

        // 1. Player Rotation & Movement (WASD + Arrow Keys + Mouse Steering)
        if (!sim.isDowned) {
          if (keysHeld.has('ArrowLeft') || keysHeld.has('KeyQ')) {
            sim.rotY += 2.3 * dt;
          }
          if (keysHeld.has('ArrowRight') || keysHeld.has('KeyE')) {
            // Note: KeyE also interacts with nearby pickups below
          }
          if (Math.abs(pointerNormX) > 0.25 && mouseDown) {
            sim.rotY -= pointerNormX * 1.45 * dt;
          }

          let moveForward = 0;
          let moveStrafe = 0;
          if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) moveForward += 1;
          if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) moveForward -= 1;
          if (keysHeld.has('KeyA')) moveStrafe -= 1;
          if (keysHeld.has('KeyD')) moveStrafe += 1;

          const isSprinting =
            (keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight')) &&
            sim.stamina > 5 &&
            moveForward > 0;
          if (isSprinting) {
            sim.stamina = Math.max(0, sim.stamina - 22 * dt);
          } else {
            sim.stamina = Math.min(100, sim.stamina + 16 * dt);
          }

          const baseSpeed = sim.isCrouching ? 4.2 : isSprinting ? 10.6 : 7.2;
          const speedMult = sim.speedBuffTimer > 0 ? 1.35 : 1.0;
          const currentMoveSpeed =
            moveForward !== 0 || moveStrafe !== 0 ? baseSpeed * speedMult : 0;

          if (currentMoveSpeed > 0) {
            const forwardX = -Math.sin(sim.rotY);
            const forwardZ = -Math.cos(sim.rotY);
            const rightX = Math.cos(sim.rotY);
            const rightZ = -Math.sin(sim.rotY);

            const len = Math.hypot(moveForward, moveStrafe) || 1;
            const vx = ((forwardX * moveForward + rightX * moveStrafe) / len) * currentMoveSpeed;
            const vz = ((forwardZ * moveForward + rightZ * moveStrafe) / len) * currentMoveSpeed;

            const nextX = sim.px + vx * simDt;
            const nextZ = sim.pz + vz * simDt;
            const resolved = resolveXZCollision(nextX, nextZ, 0.55, campus.colliders);
            sim.px = resolved.x;
            sim.pz = resolved.z;

            sim.footstepAccum += currentMoveSpeed * simDt;
            if (sim.footstepAccum > 3.2) {
              sim.footstepAccum = 0;
              soundEngine.playFootstep();
            }
          }

          // Vertical Jump & Gravity
          if (sim.py > 0 || sim.vy > 0) {
            sim.py += sim.vy * simDt;
            sim.vy -= 18.5 * simDt;
            if (sim.py <= 0) {
              sim.py = 0;
              sim.vy = 0;
            }
          }

          playerRig.root.position.set(sim.px, sim.py, sim.pz);
          playerRig.root.rotation.y = sim.rotY;
          playerRig.root.scale.y = sim.isCrouching ? 0.76 : 1.0;
          animateCharacterRig(playerRig, currentMoveSpeed, simDt, elapsed, true, false, 0);
        } else {
          // Player is Downed: Squadmates can revive, or self-adrenaline recovery
          animateCharacterRig(playerRig, 0, simDt, elapsed, true, false, 0.85);
          sim.reviveTimer += dt * (activeSquad.some((s) => !s.isDowned) ? 28 : 18);
          if (sim.reviveTimer >= 100) {
            sim.isDowned = false;
            sim.reviveTimer = 0;
            sim.hp = 65;
            sim.trailingHp = 65;
            soundEngine.playPickup(true);
            showBanner('REVIVED BY SQUAD!', 'Back in Combat Action', '#10b981');
          }
        }

        // 2. Weapon Recharge & Firing (Left Mouse or KeyF / Space while aiming)
        if (sim.rechargeTimer > 0) {
          sim.rechargeTimer -= dt;
          if (sim.rechargeTimer <= 0) {
            sim.rechargeTimer = 0;
            sim.currentEnergy = sim.maxEnergy;
          }
        }
        if (sim.fireCooldown > 0) {
          sim.fireCooldown -= dt;
        }

        const wantsToShoot = mouseDown || keysHeld.has('KeyF');
        if (
          wantsToShoot &&
          !sim.isDowned &&
          sim.rechargeTimer <= 0 &&
          sim.fireCooldown <= 0
        ) {
          const eqSpec =
            FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === sim.equippedWeaponId) ||
            FICTIONAL_EQUIPMENT_ARSENAL[0];
          const wStats = computeWeaponStats(eqSpec, sim.weaponLevels[eqSpec.id] || 1);

          if (sim.currentEnergy > 0) {
            // Auto-aim slight assist toward nearest hostile in front cone
            let fireAngle = sim.rotY;
            let bestDist = 42;
            for (let i = 0; i < activeEnemies.length; i++) {
              const e = activeEnemies[i];
              if (e.koTimer > 0) continue;
              const dx = e.x - sim.px;
              const dz = e.z - sim.pz;
              const d = Math.hypot(dx, dz);
              const angleToEnemy = Math.atan2(-dx, -dz);
              let angleDiff = angleToEnemy - sim.rotY;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              if (Math.abs(angleDiff) < 0.42 && d < bestDist) {
                bestDist = d;
                fireAngle = angleToEnemy;
              }
            }

            fireWeaponProjectile(
              sim.px,
              sim.py + 1.35,
              sim.pz,
              fireAngle,
              sim.equippedWeaponId,
              sim.weaponLevels[sim.equippedWeaponId] || 1,
              true
            );
            sim.currentEnergy -= 1;
            sim.fireCooldown = 1 / eqSpec.fireRate;
            sim.cameraTrauma = Math.min(0.35, sim.cameraTrauma + 0.08);

            if (sim.currentEnergy <= 0) {
              sim.rechargeTimer = wStats.rechargeTime;
            }
          }
        }

        // 3. Update Co-op Squadmates (Follow, Roam, Shoot Hostiles & Revive)
        for (let i = 0; i < activeSquad.length; i++) {
          const sq = activeSquad[i];
          if (sq.isDowned) {
            animateCharacterRig(sq.rig, 0, simDt, elapsed, true, false, 0.85);
            const distToPlayer = Math.hypot(sim.px - sq.x, sim.pz - sq.z);
            if (distToPlayer < 4.5 && !sim.isDowned) {
              sq.reviveProgress += dt * 40;
              if (sq.reviveProgress >= 100) {
                sq.isDowned = false;
                sq.hp = sq.maxHp;
                sq.reviveProgress = 0;
                soundEngine.playPickup(true);
                showBanner(`${sq.name.toUpperCase()} REVIVED!`, 'Team Reviver Bonus +50 XP', '#38bdf8');
                sim.xp += 50;
              }
            }
            continue;
          }

          const desiredX = sim.px + Math.cos(sim.rotY + sq.roamOffsetAngle) * 4.8;
          const desiredZ = sim.pz + Math.sin(sim.rotY + sq.roamOffsetAngle) * 4.8;
          const dx = desiredX - sq.x;
          const dz = desiredZ - sq.z;
          const dist = Math.hypot(dx, dz);
          let sqSpeed = 0;

          if (dist > 1.6) {
            sqSpeed = Math.min(7.5, dist * 2.2);
            sq.rotY = Math.atan2(-dx, -dz);
            const res = resolveXZCollision(
              sq.x + (dx / dist) * sqSpeed * simDt,
              sq.z + (dz / dist) * sqSpeed * simDt,
              0.5,
              campus.colliders
            );
            sq.x = res.x;
            sq.z = res.z;
          }

          // Squadmate shoots nearest hostile
          sq.shootCooldown -= simDt;
          if (sq.shootCooldown <= 0) {
            let nearestEnemy: ActiveEnemy | null = null;
            let minD = 32;
            for (let j = 0; j < activeEnemies.length; j++) {
              const en = activeEnemies[j];
              if (en.koTimer > 0) continue;
              const ed = Math.hypot(en.x - sq.x, en.z - sq.z);
              if (ed < minD) {
                minD = ed;
                nearestEnemy = en;
              }
            }
            if (nearestEnemy) {
              sq.rotY = Math.atan2(-(nearestEnemy.x - sq.x), -(nearestEnemy.z - sq.z));
              fireWeaponProjectile(sq.x, 1.35, sq.z, sq.rotY, 'pulse_carbine', 1, false);
              sq.shootCooldown = 0.65 + Math.random() * 0.35;
            } else {
              sq.shootCooldown = 0.4;
            }
          }

          sq.rig.root.position.set(sq.x, 0, sq.z);
          sq.rig.root.rotation.y = sq.rotY;
          animateCharacterRig(sq.rig, sqSpeed, simDt, elapsed, true, false, 0);
        }

        // 4. Update Projectiles & Check Hits Against Zombies & Bosses
        for (let i = 0; i < projectilePool.length; i++) {
          const p = projectilePool[i];
          if (!p.active) continue;

          const stepDist = Math.hypot(p.vx, p.vz) * simDt;
          p.x += p.vx * simDt;
          p.z += p.vz * simDt;
          p.rangeRemaining -= stepDist;
          p.mesh.position.set(p.x, p.y, p.z);

          if (p.rangeRemaining <= 0) {
            p.active = false;
            p.mesh.visible = false;
            continue;
          }

          // Hit detection against activeEnemies
          for (let j = 0; j < activeEnemies.length; j++) {
            const e = activeEnemies[j];
            if (e.koTimer > 0) continue;
            const hitRadius = e.isBoss ? 2.4 : 0.95;
            const dx = p.x - e.x;
            const dz = p.z - e.z;
            if (dx * dx + dz * dz <= hitRadius * hitRadius) {
              p.active = false;
              p.mesh.visible = false;

              e.hp -= p.damage;
              e.hitFlashTimer = 0.08;
              e.rig.primaryMaterials.forEach((m) => m.emissive.setHex(0xffffff));

              // Elemental effects
              if (p.effect === 'cryo_slow') {
                e.slowTimer = 3.5;
              } else if (p.effect === 'plasma_splash') {
                spawnParticleBurst(e.x, 1.4, e.z, 0xef4444, 18);
                sim.cameraTrauma = Math.min(0.6, sim.cameraTrauma + 0.16);
              } else {
                spawnParticleBurst(e.x, 1.3, e.z, 0xf59e0b, 7);
              }

              // Knockback impulse
              const kb = e.isBoss ? 0.12 : 0.45;
              const pLen = Math.hypot(p.vx, p.vz) || 1;
              const kRes = resolveXZCollision(
                e.x + (p.vx / pLen) * kb,
                e.z + (p.vz / pLen) * kb,
                0.6,
                campus.colliders
              );
              e.x = kRes.x;
              e.z = kRes.z;

              if (e.hp <= 0) {
                e.hp = 0;
                e.koTimer = 0.01; // Start KO topple transition
                sim.hitstopTimer = e.isBoss ? 0.08 : 0.035;
                sim.cameraTrauma = Math.min(0.75, sim.cameraTrauma + (e.isBoss ? 0.45 : 0.14));
                soundEngine.playHit(true);

                const mult = sim.doubleScrapTimer > 0 ? 2 : 1;
                const earnedScrap = e.scrapReward * mult;
                const earnedXp = e.xpReward * mult;
                sim.scrap += earnedScrap;
                sim.xp += earnedXp;
                sim.level = 1 + Math.floor(sim.xp / 500);
                sim.runKills += 1;
                sim.runScrapEarned += earnedScrap;
                sim.runXpEarned += earnedXp;

                if (e.isBoss) {
                  sim.runBossKills += 1;
                  showBanner(
                    `${e.name} DEFEATED!`,
                    `+${earnedXp} XP · +${earnedScrap} SCRAP · LEGENDARY SUPPLY DROPPED`,
                    '#10b981'
                  );
                  spawnPickupAt(e.x, e.z, 'supply_crate', 'titan_omega_launcher');
                  saveProgress(sim.wave, 1, 1);
                } else {
                  saveProgress(sim.wave, 1, 0);
                  // Random loot drop chance
                  const diffCfg = DIFFICULTY_PRESETS[sim.difficulty];
                  if (Math.random() < diffCfg.lootDropChance) {
                    const dropPool: PickupType[] = [
                      'health_small',
                      'armor_basic',
                      'energy_pack',
                      'scrap_cache',
                      'health_medium',
                      'armor_restore',
                    ];
                    const chosen = dropPool[Math.floor(Math.random() * dropPool.length)];
                    spawnPickupAt(e.x, e.z, chosen);
                  }
                }
              } else {
                soundEngine.playHit(false);
              }
              break;
            }
          }
        }

        // 5. Update Zombies & Boss AI (Roaming, Detection, Pursuit, Windup Telegraph & Attack Token Pool)
        let concurrentAttackers = 0;
        const MAX_CONCURRENT_ATTACKERS = 3;

        for (let i = activeEnemies.length - 1; i >= 0; i--) {
          const e = activeEnemies[i];

          // Hit flash reset
          if (e.hitFlashTimer > 0) {
            e.hitFlashTimer -= dt;
            if (e.hitFlashTimer <= 0) {
              e.rig.primaryMaterials.forEach((m) => m.emissive.setHex(0x000000));
            }
          }

          // KO topple transition (0.4s before removal)
          if (e.koTimer > 0) {
            e.koTimer += dt * 2.6;
            animateCharacterRig(e.rig, 0, dt, elapsed, false, false, e.koTimer);
            if (e.koTimer >= 1.1) {
              enemiesGroup.remove(e.rig.root);
              activeEnemies.splice(i, 1);
            }
            continue;
          }

          if (e.slowTimer > 0) e.slowTimer -= dt;
          if (e.cooldownTimer > 0) e.cooldownTimer -= simDt;

          const dxToPlayer = sim.px - e.x;
          const dzToPlayer = sim.pz - e.z;
          const distToPlayer = Math.hypot(dxToPlayer, dzToPlayer);

          const effectiveSpeed = e.speed * (e.slowTimer > 0 ? 0.5 : 1.0);
          let currentMoveSpeed = 0;

          if (distToPlayer <= e.attackRange && concurrentAttackers < MAX_CONCURRENT_ATTACKERS) {
            concurrentAttackers++;
            e.rotY = Math.atan2(-dxToPlayer, -dzToPlayer);

            if (e.cooldownTimer <= 0) {
              e.windupTimer += simDt;
              if (e.windupTimer >= e.attackWindup) {
                // Execute Attack!
                e.windupTimer = 0;
                e.cooldownTimer = e.attackCooldown;

                if (distToPlayer <= e.attackRange + 0.8 && !sim.isDowned) {
                  const protection = sim.shieldBuffTimer > 0 ? 0.82 : 0.65;
                  const dmgRes = applyDamageWithArmor(
                    sim.hp,
                    sim.armor,
                    e.baseDamage,
                    protection
                  );
                  sim.hp = dmgRes.newHp;
                  sim.armor = dmgRes.newArmor;
                  sim.cameraTrauma = Math.min(0.65, sim.cameraTrauma + 0.28);
                  soundEngine.playPlayerHurt();

                  if (dmgRes.isDowned) {
                    sim.downedCountThisRun += 1;
                    if (activeSquad.some((s) => !s.isDowned)) {
                      sim.isDowned = true;
                      sim.reviveTimer = 0;
                      showBanner('SURVIVOR DOWNED!', 'Squadmates En Route to Revive', '#ef4444');
                    } else {
                      // Solo / Full Squad Eliminated -> Game Over after short beat
                      setRunSnapshot({
                        victory: false,
                        finalWave: sim.wave,
                        kills: sim.runKills,
                        bossesKilled: sim.runBossKills,
                        scrapEarned: sim.runScrapEarned,
                        xpEarned: sim.runXpEarned,
                        survivalSeconds: Math.round((performance.now() - sim.runStartTime) / 1000),
                      });
                      setShellState('gameover');
                    }
                  }
                }
              }
            }
          } else if (distToPlayer <= e.detectionRange) {
            // Player detected -> pursue with archetype-specific movement policy
            e.windupTimer = 0;
            let moveAngle = Math.atan2(-dxToPlayer, -dzToPlayer);
            if (e.zombieClass === 'stalker') {
              // Flanker weaves laterally while closing distance
              moveAngle += Math.sin(elapsed * 3.5 + e.id) * 0.55;
            }
            e.rotY = moveAngle;
            currentMoveSpeed = effectiveSpeed;
            const nx = e.x - Math.sin(moveAngle) * currentMoveSpeed * simDt;
            const nz = e.z - Math.cos(moveAngle) * currentMoveSpeed * simDt;
            const col = resolveXZCollision(nx, nz, e.isBoss ? 1.2 : 0.55, campus.colliders);
            e.x = col.x;
            e.z = col.z;
          } else {
            // Natural Roaming around Campus Walkways & Quadrangle
            e.windupTimer = 0;
            if (e.roamIdleTimer > 0) {
              e.roamIdleTimer -= simDt;
            } else {
              const rdx = e.roamTargetX - e.x;
              const rdz = e.roamTargetZ - e.z;
              const rDist = Math.hypot(rdx, rdz);
              if (rDist < 2.2) {
                e.roamIdleTimer = 1.0 + Math.random() * 2.0;
                const nextPt =
                  campus.zombieSpawnPoints[
                    Math.floor(Math.random() * campus.zombieSpawnPoints.length)
                  ];
                e.roamTargetX = nextPt.x;
                e.roamTargetZ = nextPt.z;
              } else {
                e.rotY = Math.atan2(-rdx, -rdz);
                currentMoveSpeed = effectiveSpeed * 0.55;
                const col = resolveXZCollision(
                  e.x + (rdx / rDist) * currentMoveSpeed * simDt,
                  e.z + (rdz / rDist) * currentMoveSpeed * simDt,
                  0.55,
                  campus.colliders
                );
                e.x = col.x;
                e.z = col.z;
              }
            }
          }

          e.rig.root.position.set(e.x, 0, e.z);
          e.rig.root.rotation.y = e.rotY;
          animateCharacterRig(
            e.rig,
            currentMoveSpeed,
            simDt,
            elapsed,
            false,
            e.windupTimer > 0,
            0
          );
        }

        // 6. Update & Collect Interactive Ground Pickups / Supply Crates
        let closestPrompt = '';
        for (let i = activePickups.length - 1; i >= 0; i--) {
          const pk = activePickups[i];
          if (pk.collected) continue;

          pk.mesh.rotation.y += 1.4 * dt;
          const dist = Math.hypot(sim.px - pk.x, sim.pz - pk.z);
          const pSpec = PICKUP_CATALOG[pk.type];

          if (dist < 4.2) {
            closestPrompt = `[E] Collect ${pSpec.name}`;
          }

          // Collect automatically within 1.85m or when pressing E within 4.2m
          if (dist < 1.85 || (dist < 4.2 && keysHeld.has('KeyE'))) {
            pk.collected = true;
            pickupsGroup.remove(pk.mesh);
            activePickups.splice(i, 1);

            if (pSpec.healAmount > 0) {
              sim.hp = Math.min(sim.maxHp, sim.hp + pSpec.healAmount);
            }
            if (pSpec.armorAmount > 0) {
              sim.armor = Math.min(sim.maxArmor, sim.armor + pSpec.armorAmount);
            }
            if (pSpec.scrapAmount > 0) {
              sim.scrap += pSpec.scrapAmount;
              sim.runScrapEarned += pSpec.scrapAmount;
            }
            if (pSpec.energyRefill) {
              sim.currentEnergy = sim.maxEnergy;
              sim.rechargeTimer = 0;
            }
            if (pSpec.buffType === 'speed') {
              sim.speedBuffTimer = pSpec.buffDuration || 12;
            } else if (pSpec.buffType === 'shield') {
              sim.shieldBuffTimer = pSpec.buffDuration || 15;
            } else if (pSpec.buffType === 'double_scrap') {
              sim.doubleScrapTimer = pSpec.buffDuration || 20;
            }

            if (pk.weaponUnlockId) {
              const unlockedId = pk.weaponUnlockId;
              const wSpec = FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === unlockedId);
              if (wSpec) {
                if (!sim.unlockedWeapons.includes(unlockedId)) {
                  sim.unlockedWeapons = [...sim.unlockedWeapons, unlockedId];
                  setUnlockedWeapons([...sim.unlockedWeapons]);
                }
                sim.equippedWeaponId = unlockedId;
                const st = computeWeaponStats(wSpec, sim.weaponLevels[unlockedId] || 1);
                sim.maxEnergy = st.energyCapacity;
                sim.currentEnergy = st.energyCapacity;
                soundEngine.playPickup(true);
                showBanner(
                  `WEAPON ACQUIRED: ${wSpec.name.toUpperCase()}`,
                  `${wSpec.rarity.toUpperCase()} · ${wSpec.roleClue}`,
                  '#facc15'
                );
              }
            } else {
              soundEngine.playPickup(pSpec.rarity === 'rare' || pSpec.rarity === 'epic');
              showBanner(`COLLECTED: ${pSpec.name.toUpperCase()}`, pSpec.rarity.toUpperCase(), '#22c55e');
            }
          }
        }

        // 7. Wave Spawning & Progression Manager
        const diffCfg = DIFFICULTY_PRESETS[sim.difficulty];
        if (sim.prepTimer > 0) {
          sim.prepTimer -= dt;
          if (sim.prepTimer <= 0) {
            sim.prepTimer = 0;
            const nextWaveDef = getWaveDefinition(sim.wave, sim.difficulty);
            sim.waveEnemiesToSpawn = nextWaveDef.totalEnemies;
            soundEngine.playWaveHorn();
            showBanner(nextWaveDef.title.toUpperCase(), 'Hostile Wave Inbound!', '#f59e0b');
            if (nextWaveDef.bossTier) {
              spawnBoss(nextWaveDef.bossTier);
            }
          }
        } else {
          // Spawn queued enemies up to maxActiveEnemies
          const aliveCount = activeEnemies.filter((e) => e.koTimer === 0).length;
          sim.waveEnemiesAlive = aliveCount + sim.waveEnemiesToSpawn;

          if (sim.waveEnemiesToSpawn > 0 && aliveCount < diffCfg.maxActiveEnemies) {
            sim.spawnTimer -= dt;
            if (sim.spawnTimer <= 0) {
              sim.spawnTimer = 1.6;
              const wDef = getWaveDefinition(sim.wave, sim.difficulty);
              const pickClass =
                wDef.composition[Math.floor(Math.random() * wDef.composition.length)];
              spawnZombie(pickClass);
              sim.waveEnemiesToSpawn -= 1;
            }
          } else if (sim.waveEnemiesToSpawn === 0 && aliveCount === 0) {
            // Wave Cleared!
            if (sim.wave >= 10 && sim.mode !== 'endless') {
              // Victory on Wave 10!
              setRunSnapshot({
                victory: true,
                finalWave: sim.wave,
                kills: sim.runKills,
                bossesKilled: sim.runBossKills,
                scrapEarned: sim.runScrapEarned,
                xpEarned: sim.runXpEarned,
                survivalSeconds: Math.round((performance.now() - sim.runStartTime) / 1000),
              });
              setShellState('gameover');
            } else {
              sim.wave += 1;
              sim.prepTimer = diffCfg.prepTimeSeconds;
              sim.scrap += 100;
              // Spawn fresh supply drop in Central Quadrangle between waves
              const bonusPt =
                campus.lootSpawnPoints[
                  Math.floor(Math.random() * campus.lootSpawnPoints.length)
                ];
              spawnPickupAt(bonusPt.x, bonusPt.z, 'supply_crate');
              showBanner(
                `WAVE ${sim.wave - 1} CLEARED!`,
                `Next Wave in ${diffCfg.prepTimeSeconds}s · Supply Crate Dropped`,
                '#10b981'
              );
            }
          }
        }

        // 8. Update Pooled Particle Bursts
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const p = particleData[i];
          if (!p.active) continue;
          p.life -= dt;
          if (p.life <= 0) {
            p.active = false;
            _dummyObj.position.set(0, -100, 0);
            _dummyObj.scale.setScalar(0.001);
            _dummyObj.updateMatrix();
            particleInst.setMatrixAt(i, _dummyObj.matrix);
          } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 12 * dt;
            _dummyObj.position.set(p.x, Math.max(0.05, p.y), p.z);
            _dummyObj.scale.setScalar(p.life / p.maxLife);
            _dummyObj.updateMatrix();
            particleInst.setMatrixAt(i, _dummyObj.matrix);
          }
        }
        particleInst.instanceMatrix.needsUpdate = true;

        // 9. Third-Person Over-the-Shoulder Follow Camera with Exponential Damping & Trauma Shake
        sim.cameraTrauma = Math.max(0, sim.cameraTrauma - 1.6 * dt);
        const shake = sim.cameraTrauma * sim.cameraTrauma;
        const shakeX = (Math.random() - 0.5) * shake * 0.7;
        const shakeY = (Math.random() - 0.5) * shake * 0.7;

        const camDist = sim.isAimingZoom ? 3.4 : 6.2;
        const camHeight = sim.isCrouching ? 2.1 : 2.75;
        const shoulderRightOffset = 0.85;

        const forwardX = -Math.sin(sim.rotY);
        const forwardZ = -Math.cos(sim.rotY);
        const rightX = Math.cos(sim.rotY);
        const rightZ = -Math.sin(sim.rotY);

        _camDesired.set(
          sim.px - forwardX * camDist + rightX * shoulderRightOffset + shakeX,
          sim.py + camHeight + shakeY,
          sim.pz - forwardZ * camDist + rightZ * shoulderRightOffset
        );

        const dampFactor = 1 - Math.exp(-12 * dt);
        camera.position.lerp(_camDesired, dampFactor);

        _camTarget.set(
          sim.px + forwardX * 16 + rightX * 0.4,
          sim.py + 1.55,
          sim.pz + forwardZ * 16 + rightZ * 0.4
        );
        camera.lookAt(_camTarget);

        // 10. Throttled HUD Sync (<= 10Hz so React state never slows down 60fps loop)
        hudUpdateAccum += dt;
        if (hudUpdateAccum >= 0.12) {
          hudUpdateAccum = 0;

          const activeBoss = activeEnemies.find((e) => e.isBoss && e.koTimer === 0);
          const wDef = getWaveDefinition(sim.wave, sim.difficulty);
          const dirOut = evaluateDynamicDifficulty({
            playerHpRatio: sim.hp / sim.maxHp,
            recentKillRatePerMin: sim.runKills * 2,
            downedCount: sim.downedCountThisRun,
            baseDifficulty: sim.difficulty,
          });

          const buffs: string[] = [];
          if (sim.speedBuffTimer > 0) buffs.push(`SPEED ${sim.speedBuffTimer.toFixed(0)}s`);
          if (sim.shieldBuffTimer > 0) buffs.push(`SHIELD ${sim.shieldBuffTimer.toFixed(0)}s`);
          if (sim.doubleScrapTimer > 0) buffs.push(`2X SCRAP ${sim.doubleScrapTimer.toFixed(0)}s`);

          setHudState({
            hp: Math.round(sim.hp),
            maxHp: sim.maxHp,
            trailingHp: Math.round(sim.trailingHp),
            armor: Math.round(sim.armor),
            maxArmor: sim.maxArmor,
            stamina: Math.round(sim.stamina),
            wave: sim.wave,
            waveTitle: wDef.title,
            enemiesRemaining: sim.waveEnemiesAlive,
            prepCountdown: Math.ceil(sim.prepTimer),
            scrap: sim.scrap,
            xp: sim.xp,
            level: sim.level,
            currentZone: getCampusZoneName(sim.px, sim.pz),
            equippedWeaponId: sim.equippedWeaponId,
            currentEnergy: sim.currentEnergy,
            maxEnergy: sim.maxEnergy,
            isRecharging: sim.rechargeTimer > 0,
            directorStatus: dirOut.statusLabel,
            activeBossName: activeBoss ? activeBoss.name : '',
            activeBossSubtitle:
              activeBoss && activeBoss.bossTier
                ? BOSS_SPECS[activeBoss.bossTier].subtitle
                : '',
            activeBossHp: activeBoss ? Math.round(activeBoss.hp) : 0,
            activeBossMaxHp: activeBoss ? activeBoss.maxHp : 1,
            nearbyPickupPrompt: closestPrompt,
            isPlayerDowned: sim.isDowned,
            reviveProgress: Math.round(sim.reviveTimer),
            playerX: sim.px,
            playerZ: sim.pz,
            playerRotY: sim.rotY,
            activeBuffs: buffs,
          });

          setSquadHud(
            activeSquad.map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role,
              hp: Math.round(s.hp),
              maxHp: s.maxHp,
              isDowned: s.isDowned,
            }))
          );

          const mEntities: MinimapEntity[] = [];
          activeEnemies.forEach((e) => {
            if (e.koTimer === 0) {
              mEntities.push({
                x: e.x,
                z: e.z,
                type: e.isBoss ? 'boss' : 'zombie',
              });
            }
          });
          activeSquad.forEach((s) => {
            mEntities.push({
              x: s.x,
              z: s.z,
              type: s.isDowned ? 'teammate_downed' : 'teammate',
            });
          });
          activePickups.forEach((p) => {
            if (!p.collected) {
              mEntities.push({
                x: p.x,
                z: p.z,
                type: p.type === 'supply_crate' ? 'crate' : 'loot',
              });
            }
          });
          setMinimapEntities(mEntities);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [handleStartGame, handleUseInventoryItem, saveProgress, showBanner]);

  // Derived Weapon & Achievements
  const equippedWeaponSpec =
    FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === hudState.equippedWeaponId) ||
    FICTIONAL_EQUIPMENT_ARSENAL[0];
  const equippedWeaponStats = computeWeaponStats(
    equippedWeaponSpec,
    weaponLevels[equippedWeaponSpec.id] || 1
  );

  const achievementsList: AchievementEntry[] = [
    {
      id: 'first_wave',
      title: 'Quadrangle Defender',
      description: 'Survive the initial Campus Outbreak wave.',
      unlocked: careerStats.bestWave >= 2 || hudState.wave >= 2,
    },
    {
      id: 'first_boss',
      title: 'Titan Slayer',
      description: 'Defeat a Mini-Boss, Skull-Drake Titan, or The Campus Destroyer.',
      unlocked: careerStats.bossesDefeated >= 1,
    },
    {
      id: 'five_waves',
      title: 'Academic Lockdown Veteran',
      description: 'Reach Wave 5 or higher on the Campus 3D Map.',
      unlocked: careerStats.bestWave >= 5 || hudState.wave >= 5,
    },
    {
      id: 'ten_waves',
      title: 'Campus Legend',
      description: 'Survive all 10 Waves of Campus: Last Stand.',
      unlocked: careerStats.bestWave >= 10,
    },
    {
      id: 'arsenal_upgrader',
      title: 'Chief Artificer',
      description: 'Upgrade any fictional energy emitter to Level 2 or higher.',
      unlocked: Object.values(weaponLevels).some((lv) => lv >= 2),
    },
    {
      id: 'exterminator',
      title: 'Outbreak Containment',
      description: 'Eliminate at least 15 infected hostiles across your career.',
      unlocked: careerStats.totalKills >= 15,
    },
  ];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      {/* 1. ISOLATED THREE.JS WEBGL VIEWPORT CONTAINER */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 2. LOW-HP CRITICAL VIGNETTE */}
      {shellState === 'playing' && hudState.hp <= 30 && (
        <div
          className="fixed inset-0 pointer-events-none z-10"
          style={{
            boxShadow: 'inset 0 0 110px rgba(220, 38, 38, 0.55)',
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* 3. TITLE SCREEN OVERLAY (Stage 1: Live 3D Campus Camera Tour)        */}
      {/* ==================================================================== */}
      {shellState === 'title' && (
        <div
          className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(12,10,9,0.88) 0%, rgba(12,10,9,0.45) 52%, rgba(12,10,9,0.15) 100%)',
          }}
        >
          {/* Left Negative-Space Column: Bespoke Inline SVG Title Lockup & Mode Controls */}
          <div className="max-w-xl space-y-6 pointer-events-auto my-auto">
            {/* Bespoke Inline SVG Title Lockup */}
            <div className="space-y-2">
              <svg
                viewBox="0 0 520 118"
                className="w-full max-w-[480px] h-auto drop-shadow-md"
                role="img"
                aria-label="Campus: Last Stand — Complete 3D Zombie & Titan Survival"
              >
                <rect
                  x="2"
                  y="2"
                  width="516"
                  height="114"
                  fill="#0c0a09"
                  fillOpacity="0.82"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />
                <rect x="10" y="10" width="6" height="98" fill="#ef4444" />
                <text
                  x="28"
                  y="56"
                  fill="#fafaf9"
                  fontFamily="var(--font-display), monospace"
                  fontWeight="700"
                  fontSize="44"
                  letterSpacing="3"
                >
                  CAMPUS: LAST STAND
                </text>
                <text
                  x="30"
                  y="92"
                  fill="#f59e0b"
                  fontFamily="var(--font-mono), monospace"
                  fontWeight="700"
                  fontSize="16"
                  letterSpacing="4.5"
                >
                  ZOMBIE &amp; TITAN OUTBREAK · 180M × 160M 3D ATLAS
                </text>
              </svg>
            </div>

            {/* Game Mode Selector (Single Player / Co-op 4P / Endless Survival) */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-stone-300 uppercase tracking-wider">
                1. Select Survival Mode
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'single', label: 'Single Player' },
                    { id: 'coop', label: 'Multiplayer Co-op' },
                    { id: 'endless', label: 'Endless Waves' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGameMode(m.id)}
                    className={`py-2.5 px-3 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer whitespace-nowrap ${
                      gameMode === m.id
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-900/90 text-stone-200 border-stone-700 hover:border-stone-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Preset Selector (Easy / Normal / Hard) */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-stone-300 uppercase tracking-wider">
                2. Select Difficulty &amp; Dynamic Director Preset
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map((d) => {
                  const cfg = DIFFICULTY_PRESETS[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-3 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                        difficulty === d
                          ? 'bg-red-600 text-white border-red-400'
                          : 'bg-stone-900/90 text-stone-300 border-stone-700 hover:border-stone-500'
                      }`}
                    >
                      {cfg.label} ({cfg.maxActiveEnemies} Max)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Start Action + Secondary Hub Actions (<= 3 menu actions) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={() => handleStartGame()}
                className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-base uppercase tracking-wider border-2 border-amber-300 shadow-xl cursor-pointer whitespace-nowrap"
              >
                Deploy To Campus [Enter]
              </button>

              <button
                type="button"
                onClick={() => {
                  setArmoryInitialTab('lobby');
                  setArmoryModalOpen(true);
                }}
                className="px-4 py-4 bg-stone-900/95 hover:bg-stone-800 text-stone-100 font-mono font-semibold text-xs uppercase border border-stone-700 cursor-pointer whitespace-nowrap"
              >
                Armory &amp; Co-op Lobby
              </button>

              <button
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="px-4 py-4 bg-stone-900/95 hover:bg-stone-800 text-amber-400 font-mono font-semibold text-xs uppercase border border-amber-500/50 cursor-pointer whitespace-nowrap"
              >
                Gemini Tactical Recon
              </button>
            </div>
          </div>

          {/* Single Flat Borderless Control-Hint Line in Bottom Safe Margin */}
          <div className="text-xs font-mono text-stone-300 tracking-wide pointer-events-none">
            WASD Move · Mouse / F Aim &amp; Shoot · Shift Sprint · Space Jump · E Interact · H Medkit · B Summon Titan · P / Esc Pause
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. IN-GAME WORLD-MATCHED PERIMETER HUD (>= 85% Unobstructed Center)  */}
      {/* ==================================================================== */}
      {shellState === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none">
          {/* Center Tactical Crosshair Reticle */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="28" height="28" viewBox="0 0 28 28" className="opacity-80">
              <circle
                cx="14"
                cy="14"
                r="8"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <circle cx="14" cy="14" r="1.8" fill="#ef4444" />
            </svg>
          </div>

          {/* CLUSTER 1 (TOP-LEFT): Vitality, Armor, Stamina, Level & Co-op Squad */}
          <div className="absolute top-4 left-4 w-64 space-y-2.5 pointer-events-none">
            <div className="p-3 bg-stone-950/90 border border-stone-700/90 shadow-lg space-y-2">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  HP · LV.{hudState.level}
                </span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">
                  {hudState.hp}/{hudState.maxHp}
                </span>
              </div>
              {/* Health Bar with Delayed Trailing Damage Ghost Bar */}
              <div className="relative w-full h-3 bg-stone-900 border border-stone-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-red-500/70 transition-all duration-150"
                  style={{ width: `${(hudState.trailingHp / hudState.maxHp) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500"
                  style={{ width: `${(hudState.hp / hudState.maxHp) * 100}%` }}
                />
              </div>

              {/* Armor Bar */}
              <div className="flex items-baseline justify-between font-mono pt-0.5">
                <span className="text-[10px] font-bold text-stone-400 uppercase">ARMOR</span>
                <span className="text-xs font-bold text-sky-400 tabular-nums">
                  {hudState.armor}/{hudState.maxArmor}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-900 border border-stone-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${(hudState.armor / hudState.maxArmor) * 100}%` }}
                />
              </div>

              {/* Stamina Bar */}
              <div className="w-full h-1 bg-stone-900 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${hudState.stamina}%` }}
                />
              </div>

              {/* Scrap & XP Readout */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-xs font-mono tabular-nums">
                <span className="text-amber-400 font-bold">SCRAP: {hudState.scrap}</span>
                <span className="text-stone-300">XP: {hudState.xp}</span>
              </div>
            </div>

            {/* Co-op Squad Teammates Status */}
            {squadHud.length > 0 && (
              <div className="p-2.5 bg-stone-950/85 border border-stone-800 space-y-1.5">
                <div className="text-[10px] font-mono text-stone-400 uppercase">
                  CO-OP SQUAD ({squadHud.length + 1}P ACTIVE)
                </div>
                {squadHud.map((sq) => (
                  <div key={sq.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-stone-200">{sq.name}</span>
                      <span
                        className={
                          sq.isDowned ? 'text-amber-400 font-bold' : 'text-emerald-400 tabular-nums'
                        }
                      >
                        {sq.isDowned ? 'DOWNED [REVIVE]' : `${sq.hp}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-900">
                      <div
                        className={`h-full ${sq.isDowned ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(sq.hp / sq.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CLUSTER 2 (TOP-CENTER): Campus Zone, Wave Status & TITAN BOSS HP BAR */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-lg px-4 pointer-events-none">
            <div className="px-4 py-2 bg-stone-950/90 border border-stone-700/90 text-center shadow-lg">
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                {hudState.waveTitle} ·{' '}
                {hudState.prepCountdown > 0
                  ? `NEXT WAVE IN ${hudState.prepCountdown}S`
                  : `${hudState.enemiesRemaining} HOSTILES REMAINING`}
              </div>
              <div className="text-[11px] font-mono text-stone-300">
                ZONE: {hudState.currentZone} · DIRECTOR: {hudState.directorStatus}
              </div>
            </div>

            {/* TITAN BOSS HEALTH BAR (Matches Reference Videos 1 & 2!) */}
            {hudState.activeBossName && (
              <div className="w-full p-3 bg-stone-950/95 border-2 border-red-600 shadow-2xl space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-widest block">
                      {hudState.activeBossSubtitle}
                    </span>
                    <span className="text-base font-bold text-white uppercase tracking-wider">
                      {hudState.activeBossName}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-red-400 tabular-nums">
                    {Math.round((hudState.activeBossHp / hudState.activeBossMaxHp) * 100)}% (
                    {hudState.activeBossHp})
                  </span>
                </div>
                <div className="w-full h-3.5 bg-stone-900 border border-red-900 overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-100"
                    style={{
                      width: `${Math.max(
                        0,
                        (hudState.activeBossHp / hudState.activeBossMaxHp) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Floating Event / Pickup / Boss Banner */}
            {floatingBanner && (
              <div
                className="px-5 py-2.5 bg-stone-950/95 border-2 text-center shadow-xl"
                style={{ borderColor: floatingBanner.color }}
              >
                <div
                  className="text-sm font-mono font-bold uppercase tracking-wider"
                  style={{ color: floatingBanner.color }}
                >
                  {floatingBanner.text}
                </div>
                {floatingBanner.subtext && (
                  <div className="text-xs font-mono text-stone-200">
                    {floatingBanner.subtext}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CLUSTER 3 (TOP-RIGHT): Accurate Campus Minimap & Utility Controls */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
            <CampusMinimap
              playerX={hudState.playerX}
              playerZ={hudState.playerZ}
              playerRotY={hudState.playerRotY}
              entities={minimapEntities}
              expanded={minimapExpanded}
              onToggleExpand={() => setMinimapExpanded((v) => !v)}
            />

            {/* Compact Clickable Square Utility Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  simRef.current.summonBossNow(3);
                }}
                aria-label="Summon Titan Boss"
                title="Summon Final Titan Boss [B]"
                className="px-2.5 h-9 bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-700 text-[11px] font-mono font-bold uppercase cursor-pointer"
              >
                TITAN [B]
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setArmoryInitialTab('armory');
                  setArmoryModalOpen(true);
                }}
                aria-label="Open Armory and Upgrades"
                title="Armory & Upgrades [U]"
                className="px-2.5 h-9 bg-stone-950/90 hover:bg-stone-800 text-amber-400 border border-stone-700 text-[11px] font-mono font-bold uppercase cursor-pointer"
              >
                ARMORY [U]
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setAiModalOpen(true);
                }}
                aria-label="Open Gemini Tactical Recon"
                title="Gemini Tactical Recon [T]"
                className="px-2.5 h-9 bg-stone-950/90 hover:bg-stone-800 text-sky-400 border border-stone-700 text-[11px] font-mono font-bold uppercase cursor-pointer"
              >
                AI INTEL [T]
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setMuted(soundEngine.toggleMute());
                }}
                aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="w-9 h-9 flex items-center justify-center bg-stone-950/90 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-mono cursor-pointer"
              >
                {muted ? 'MUTE' : 'SND'}
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShellState('paused');
                }}
                aria-label="Pause Game"
                className="w-9 h-9 flex items-center justify-center bg-stone-950/90 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-mono font-bold cursor-pointer"
              >
                II
              </button>
            </div>
          </div>

          {/* Interactive Pickup Prompt Near Player */}
          {hudState.nearbyPickupPrompt && (
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-950/95 border border-amber-500 text-amber-400 text-xs font-mono font-bold uppercase shadow-lg">
              {hudState.nearbyPickupPrompt}
            </div>
          )}

          {/* CLUSTER 4 (BOTTOM-RIGHT): Equipped Fictional Energy Weapon & Medkit Slot */}
          <div className="absolute bottom-4 right-4 flex items-end gap-3 pointer-events-auto">
            {/* Quick Medkit Button */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                handleUseInventoryItem('medkit_large');
              }}
              className="p-3 bg-stone-950/90 hover:bg-stone-900 border border-stone-700 text-left font-mono cursor-pointer"
            >
              <span className="text-[10px] text-emerald-400 font-bold block">MEDKIT [H]</span>
              <span className="text-sm font-bold text-stone-100 tabular-nums">
                x{inventory.find((i) => i.id === 'medkit_large')?.quantity || 0}
              </span>
            </button>

            {/* Equipped Weapon Readout */}
            <div className="p-3.5 bg-stone-950/90 border border-stone-700 min-w-[230px] space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[10px] font-bold uppercase text-amber-400">
                  {equippedWeaponSpec.rarity} · LV.{equippedWeaponStats.level}{' '}
                  {equippedWeaponStats.levelName}
                </span>
                <span className="text-[10px] text-stone-400">[R] RECHARGE</span>
              </div>

              <div className="flex items-baseline justify-between font-mono">
                <span className="text-sm font-bold text-stone-100 truncate max-w-[145px]">
                  {equippedWeaponSpec.name}
                </span>
                <span className="text-2xl font-bold text-amber-400 tabular-nums">
                  {hudState.isRecharging
                    ? 'RECHG'
                    : `${hudState.currentEnergy}/${hudState.maxEnergy}`}
                </span>
              </div>

              {/* Weapon Quick-Switch Bar (1-6) */}
              <div className="flex items-center gap-1 pt-1">
                {FICTIONAL_EQUIPMENT_ARSENAL.map((w, idx) => {
                  const unlocked = unlockedWeapons.includes(w.id);
                  const active = hudState.equippedWeaponId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      tabIndex={-1}
                      disabled={!unlocked}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        simRef.current.equippedWeaponId = w.id;
                        const st = computeWeaponStats(w, weaponLevels[w.id] || 1);
                        simRef.current.maxEnergy = st.energyCapacity;
                        simRef.current.currentEnergy = st.energyCapacity;
                      }}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold border cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-300'
                          : unlocked
                          ? 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                          : 'bg-stone-950 text-stone-600 border-stone-900 cursor-not-allowed'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. PAUSE MODAL CARD (Single Focused Modal Card)                      */}
      {/* ==================================================================== */}
      {shellState === 'paused' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
        >
          <div className="w-full max-w-md bg-stone-950 border-2 border-stone-700 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-stone-800 pb-3">
              <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-amber-400">
                 TACTICAL PAUSE
              </h2>
              <p className="text-xs font-mono text-stone-400 mt-1">
                {hudState.waveTitle} · Zone: {hudState.currentZone}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-center">
              <div className="p-2.5 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">WAVE</span>
                <span className="text-lg font-bold text-stone-100">{hudState.wave}</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">SCRAP</span>
                <span className="text-lg font-bold text-amber-400">{hudState.scrap}</span>
              </div>
              <div className="p-2.5 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">LEVEL</span>
                <span className="text-lg font-bold text-emerald-400">LV.{hudState.level}</span>
              </div>
            </div>

            {/* Graphics Quality Preset */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-stone-400">GRAPHICS PRESET:</span>
              <div className="flex gap-1">
                {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setGraphicsQuality(q)}
                    className={`px-2.5 py-1 uppercase cursor-pointer ${
                      graphicsQuality === q
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'bg-stone-900 text-stone-400'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-sm uppercase tracking-wider cursor-pointer"
              >
                Resume Mission [Esc]
              </button>

              <button
                type="button"
                onClick={() => {
                  setArmoryInitialTab('armory');
                  setArmoryModalOpen(true);
                }}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 font-mono font-semibold text-xs uppercase cursor-pointer"
              >
                Equipment Upgrades &amp; Inventory
              </button>

              <button
                type="button"
                onClick={() => setAiModalOpen(true)}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 font-mono font-semibold text-xs uppercase cursor-pointer"
              >
                Gemini Tactical AI &amp; Video/Image Recon
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStartGame()}
                  className="py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-mono text-xs uppercase cursor-pointer"
                >
                  Restart Wave 1
                </button>
                <button
                  type="button"
                  onClick={() => setShellState('title')}
                  className="py-2.5 bg-stone-900 hover:bg-stone-800 text-red-400 border border-stone-800 font-mono text-xs uppercase cursor-pointer"
                >
                  Return to Title
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. VICTORY / GAME OVER MODAL CARD                                    */}
      {/* ==================================================================== */}
      {shellState === 'gameover' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label={runSnapshot.victory ? 'Campus Secured Victory' : 'Survivor Eliminated Game Over'}
        >
          <div className="w-full max-w-md bg-stone-950 border-2 border-amber-500 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-stone-800 pb-3">
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
                {runSnapshot.victory ? 'CAMPUS OUTBREAK CONTAINED' : 'CAMPUS OVERRUN'}
              </div>
              <h2 className="text-2xl font-bold font-mono uppercase tracking-wider text-white mt-0.5">
                {runSnapshot.victory ? 'VICTORY — CAMPUS SECURED' : 'MISSION FAILED — ELIMINATED'}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-center">
              <div className="p-3 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">FINAL WAVE</span>
                <span className="text-xl font-bold text-amber-400">
                  {runSnapshot.finalWave}
                </span>
              </div>
              <div className="p-3 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">DEFEATED</span>
                <span className="text-xl font-bold text-emerald-400">
                  {runSnapshot.kills}
                </span>
              </div>
              <div className="p-3 bg-stone-900 border border-stone-800">
                <span className="text-[10px] text-stone-400 block">BEST WAVE</span>
                <span className="text-xl font-bold text-stone-100">
                  {Math.max(careerStats.bestWave, runSnapshot.finalWave)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                data-start="true"
                onClick={() => handleStartGame()}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-sm uppercase tracking-wider cursor-pointer"
              >
                Play Again [Enter]
              </button>

              {runSnapshot.victory && (
                <button
                  type="button"
                  onClick={() => handleStartGame('endless')}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Enter Endless Survival Mode
                </button>
              )}

              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-mono text-xs uppercase cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. ARMORY, INVENTORY & CO-OP LOBBY MODAL                             */}
      {/* ==================================================================== */}
      <ArmoryInventoryModal
        open={armoryModalOpen}
        initialTab={armoryInitialTab}
        onClose={() => setArmoryModalOpen(false)}
        scrap={hudState.scrap}
        playerLevel={hudState.level}
        playerXp={hudState.xp}
        bestWave={careerStats.bestWave}
        totalKills={careerStats.totalKills}
        bossesDefeated={careerStats.bossesDefeated}
        unlockedWeapons={unlockedWeapons}
        weaponLevels={weaponLevels}
        equippedWeaponId={hudState.equippedWeaponId}
        onEquipWeapon={(id) => {
          simRef.current.equippedWeaponId = id;
          const spec = FICTIONAL_EQUIPMENT_ARSENAL.find((w) => w.id === id);
          if (spec) {
            const st = computeWeaponStats(spec, weaponLevels[id] || 1);
            simRef.current.maxEnergy = st.energyCapacity;
            simRef.current.currentEnergy = st.energyCapacity;
          }
          setHudState((prev) => ({ ...prev, equippedWeaponId: id }));
        }}
        onUnlockWeapon={(id, cost) => {
          if (simRef.current.scrap < cost) return;
          simRef.current.scrap -= cost;
          const nextUnlocked = [...unlockedWeapons, id];
          setUnlockedWeapons(nextUnlocked);
          simRef.current.unlockedWeapons = nextUnlocked;
          simRef.current.equippedWeaponId = id;
          soundEngine.playPickup(true);
        }}
        onUpgradeWeapon={(id, cost) => {
          if (simRef.current.scrap < cost) return;
          simRef.current.scrap -= cost;
          const nextLv = Math.min(5, (weaponLevels[id] || 1) + 1);
          const nextMap = { ...weaponLevels, [id]: nextLv };
          setWeaponLevels(nextMap);
          simRef.current.weaponLevels = nextMap;
          soundEngine.playPickup(true);
        }}
        inventory={inventory}
        onUseInventoryItem={handleUseInventoryItem}
        roomCode={roomCode}
        isPublicRoom={isPublicRoom}
        onTogglePublicRoom={() => setIsPublicRoom((v) => !v)}
        onJoinRoomCode={(code) => {
          setRoomCode(code);
          showBanner(`JOINED CO-OP ROOM: ${code}`, 'Synchronizing Campus Map & Hostiles', '#38bdf8');
        }}
        squadCount={squadCount}
        onChangeSquadCount={(cnt) => {
          setSquadCount(cnt);
          simRef.current.squadCount = cnt;
        }}
        selectedSuitIndex={selectedSuitIndex}
        onSelectSuit={(idx) => {
          setSelectedSuitIndex(idx);
          simRef.current.selectedSuitIndex = idx;
          simRef.current.applySuitColors(idx);
        }}
        achievements={achievementsList}
      />

      {/* ==================================================================== */}
      {/* 8. GEMINI TACTICAL AI & MULTIMODAL RECON MODAL                       */}
      {/* ==================================================================== */}
      <TacticalAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        gameStateSummary={{
          wave: hudState.wave,
          hp: hudState.hp,
          armor: hudState.armor,
          scrap: hudState.scrap,
          equippedWeapon: equippedWeaponSpec.name,
          currentZone: hudState.currentZone,
          difficulty,
        }}
      />
    </main>
  );
}
