'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Shield,
  Heart,
  Zap,
  Crosshair,
  Volume2,
  VolumeX,
  Brain,
  Wrench,
  Play,
  Pause,
  RotateCcw,
  Skull,
  Sparkles,
  Users,
  Eye,
  ZoomIn,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import {
  GameMode,
  DifficultyPreset,
  POVMode,
  WeaponId,
  WEAPON_SPECS,
  computeWeaponStats,
  ZombieClass,
  ZOMBIE_CLASS_SPECS,
  CreepyZombieTier,
  CREEPY_ZOMBIE_TIERS,
  rollCreepyZombieTier,
  pickZombieClassForTier,
  BossId,
  BOSS_SPECS,
  getWaveDefinition,
  evaluateDynamicDifficulty,
  applyDamageWithArmor,
  PickupType,
  PICKUP_CATALOG,
  findCampusZoneAtPosition,
  resolve3DMovement,
  AABB2D,
  WallCollider3D,
  StairRampCollider,
  FloorSlabCollider,
} from '@/lib/game/rules';
import { buildCampusEnvironment } from '@/lib/game/campusBuilder';
import {
  ArticulatedRig,
  createSurvivorRig,
  createZombieRig,
  createBossRig,
  animateCharacterRig,
  buildCustomWeaponMesh,
} from '@/lib/game/characterModels';
import { soundEngine } from '@/lib/game/soundEngine';
import { downloadDeployableWebsiteFile } from '@/lib/game/exportBundle';
import CampusMinimap, { MinimapEntity } from './CampusMinimap';
import TacticalAIModal from './TacticalAIModal';
import ArmoryInventoryModal from './ArmoryInventoryModal';

type AppState = 'title' | 'playing' | 'paused' | 'gameover';

interface ActiveZombie {
  id: string;
  isBoss: boolean;
  zombieClass?: ZombieClass;
  creepyTier: CreepyZombieTier;
  bossId?: BossId;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  scoreReward: number;
  scrapReward: number;
  rig: ArticulatedRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  lastAttackAt: number;
  strafeSeed: number;
}

interface ActiveProjectile {
  id: string;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  maxDist: number;
  traveled: number;
  fromPlayer: boolean;
}

interface ActivePickupNode {
  id: string;
  type: PickupType;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
}

interface AlliedBot {
  id: string;
  name: string;
  rig: ArticulatedRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  lastShotAt: number;
}

const DEFAULT_WEAPON_LEVELS: Record<WeaponId, number> = {
  mid_assault_carbine: 1,
  mid_tactical_smg: 1,
  shotgun_pump: 1,
  shotgun_autodrum: 1,
  long_marksman_rifle: 1,
  long_heavy_lmg: 1,
  sniper_bolt: 1,
  sniper_thermal_dmr: 1,
  sniper_gauss_rail: 1,
  scar_x_projector: 1,
};

const STARTER_UNLOCKED_WEAPONS: WeaponId[] = [
  'mid_assault_carbine',
  'shotgun_pump',
  'long_marksman_rifle',
  'sniper_bolt',
];

export default function CampusSurvivalGame() {
  const [appState, setAppState] = useState<AppState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('single');
  const [difficulty, setDifficulty] = useState<DifficultyPreset>('normal');
  const [povMode, setPovMode] = useState<POVMode>('tpp');
  const [isZoomed, setIsZoomed] = useState(false);

  // Player & HUD telemetry
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [armor, setArmor] = useState(50);
  const [maxArmor] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [scrap, setScrap] = useState(320);
  const [wave, setWave] = useState(1);
  const [zombiesRemaining, setZombiesRemaining] = useState(13);
  const [totalKills, setTotalKills] = useState(0);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [highestWave, setHighestWave] = useState(1);
  const [playerElevation, setPlayerElevation] = useState(0);
  const [onStairsFlag, setOnStairsFlag] = useState(false);

  // Creepy Zombie Spawn Statistics (70% Low / 20% Mid / 10% Hard)
  const [creepySpawnCounts, setCreepySpawnCounts] = useState<{ low: number; mid: number; hard: number }>({
    low: 0,
    mid: 0,
    hard: 0,
  });

  // Weapons & Upgrades
  const [equippedWeapon, setEquippedWeapon] = useState<WeaponId>('mid_assault_carbine');
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponId[]>(STARTER_UNLOCKED_WEAPONS);
  const [weaponLevels, setWeaponLevels] = useState<Record<WeaponId, number>>(DEFAULT_WEAPON_LEVELS);
  const [ammoInMag, setAmmoInMag] = useState(WEAPON_SPECS.mid_assault_carbine.baseCapacity);
  const [isReloading, setIsReloading] = useState(false);

  // Inventory & Active Boosters
  const [inventory, setInventory] = useState<Record<PickupType, number>>({
    medkit_small: 2,
    medkit_large: 1,
    energy_cell: 2,
    armor_vest: 1,
    speed_booster: 1,
    damage_enhancer: 1,
    scrap_cache: 0,
    mystery_crate: 0,
  });
  const [speedBoostUntil, setSpeedBoostUntil] = useState(0);
  const [damageBoostUntil, setDamageBoostUntil] = useState(0);

  // Customization & Co-op
  const [suitColor, setSuitColor] = useState('#2563eb');
  const [visorColor, setVisorColor] = useState('#38bdf8');
  const [coopBotsCount, setCoopBotsCount] = useState(1);

  // Location, Boss Banner, Radio Callout
  const [currentZoneName, setCurrentZoneName] = useState('08_Quadrangle_Badminton');
  const [currentZoneDisplay, setCurrentZoneDisplay] = useState(
    'Central Flagpole Quadrangle & Badminton Courts'
  );
  const [directorLabel, setDirectorLabel] = useState<
    'Mercy Assist' | 'Balanced Flow' | 'Apex Escalation'
  >('Balanced Flow');
  const [activeBossBanner, setActiveBossBanner] = useState<{
    name: string;
    subtitle: string;
    hp: number;
    maxHp: number;
  } | null>(null);
  const [lastTargetedZombieInfo, setLastTargetedZombieInfo] = useState<{
    name: string;
    tierLabel: string;
    tierColor: string;
    hp: number;
    maxHp: number;
  } | null>(null);
  const [radioCallout, setRadioCallout] = useState(
    'HQ Recon: All buildings & staircases unlocked. Left/Right Arrows rotate view; [V] toggles First-Person POV; [Z]/Right-Click zooms scope.'
  );

  // Modals & UI toggles
  const [minimapExpanded, setMinimapExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [armoryModalOpen, setArmoryModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [damageFlash, setDamageFlash] = useState(false);

  // Minimap entities snapshot
  const [minimapEntities, setMinimapEntities] = useState<MinimapEntity[]>([]);
  const [playerCoords, setPlayerCoords] = useState({ x: 0, z: 14, yaw: 0 });

  // Refs for mutable 3D state inside animation loop
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const fppHolderRef = useRef<THREE.Group | null>(null);
  const playerRigRef = useRef<ArticulatedRig | null>(null);
  const playerPosRef = useRef({ x: 0, y: 0, z: 14, yaw: 0 });
  const cameraYawRef = useRef(0);
  const cameraPitchRef = useRef(0.28);

  const collidersRef = useRef<AABB2D[]>([]);
  const walls3DRef = useRef<WallCollider3D[]>([]);
  const stairsRef = useRef<StairRampCollider[]>([]);
  const floorsRef = useRef<FloorSlabCollider[]>([]);
  const spawnPointsRef = useRef<Array<{ x: number; z: number }>>([]);
  const pickupLocationsRef = useRef<Array<{ x: number; y?: number; z: number }>>([]);

  const zombiesRef = useRef<ActiveZombie[]>([]);
  const projectilesRef = useRef<ActiveProjectile[]>([]);
  const pickupsRef = useRef<ActivePickupNode[]>([]);
  const botsRef = useRef<AlliedBot[]>([]);

  const keysRef = useRef<Record<string, boolean>>({});
  const mouseDownRef = useRef(false);
  const lastShotTimeRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const lastRandomCreepySpawnRef = useRef(0);
  const spawnedInWaveRef = useRef(0);
  const waveTargetCountRef = useRef(13);
  const shotsFiredRef = useRef(0);
  const shotsHitRef = useRef(0);
  const timesDownedRef = useRef(0);

  // Sync refs with React state inside useEffect
  const appStateRef = useRef<AppState>(appState);
  const povModeRef = useRef<POVMode>(povMode);
  const isZoomedRef = useRef(isZoomed);
  const equippedWeaponRef = useRef<WeaponId>(equippedWeapon);
  const weaponLevelsRef = useRef(weaponLevels);
  const ammoInMagRef = useRef(ammoInMag);
  const isReloadingRef = useRef(isReloading);
  const hpRef = useRef(hp);
  const armorRef = useRef(armor);
  const staminaRef = useRef(stamina);
  const waveRef = useRef(wave);
  const difficultyRef = useRef(difficulty);
  const gameModeRef = useRef(gameMode);
  const speedBoostUntilRef = useRef(speedBoostUntil);
  const damageBoostUntilRef = useRef(damageBoostUntil);

  useEffect(() => {
    appStateRef.current = appState;
    povModeRef.current = povMode;
    isZoomedRef.current = isZoomed;
    equippedWeaponRef.current = equippedWeapon;
    weaponLevelsRef.current = weaponLevels;
    ammoInMagRef.current = ammoInMag;
    isReloadingRef.current = isReloading;
    hpRef.current = hp;
    armorRef.current = armor;
    staminaRef.current = stamina;
    waveRef.current = wave;
    difficultyRef.current = difficulty;
    gameModeRef.current = gameMode;
    speedBoostUntilRef.current = speedBoostUntil;
    damageBoostUntilRef.current = damageBoostUntil;
    document.body.dataset.state = appState;
  }, [
    appState,
    povMode,
    isZoomed,
    equippedWeapon,
    weaponLevels,
    ammoInMag,
    isReloading,
    hp,
    armor,
    stamina,
    wave,
    difficulty,
    gameMode,
    speedBoostUntil,
    damageBoostUntil,
  ]);

  const rebuildPlayerWeaponsAppearance = useCallback(
    (wId: WeaponId, sColor: string, vColor: string) => {
      const scene = sceneRef.current;
      const spec = WEAPON_SPECS[wId];
      if (scene && playerRigRef.current) {
        scene.remove(playerRigRef.current.root);
        const newRig = createSurvivorRig(sColor, vColor, spec.category, spec.colorHex);
        newRig.root.position.set(
          playerPosRef.current.x,
          playerPosRef.current.y,
          playerPosRef.current.z
        );
        newRig.root.rotation.y = playerPosRef.current.yaw;
        scene.add(newRig.root);
        playerRigRef.current = newRig;
      }
      if (fppHolderRef.current) {
        while (fppHolderRef.current.children.length > 0) {
          fppHolderRef.current.remove(fppHolderRef.current.children[0]);
        }
        const { weaponGroup } = buildCustomWeaponMesh(spec.category, spec.colorHex);
        weaponGroup.position.set(0.28, -0.24, -0.35);
        weaponGroup.scale.setScalar(0.95);
        fppHolderRef.current.add(weaponGroup);
      }
    },
    []
  );

  // Trigger fast Gemini Flash-Lite tactical radio callout on new wave
  const fetchWaveCallout = useCallback(async (wNum: number, zoneName: string) => {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fast_callout',
          prompt: `Wave ${wNum} starting in ${zoneName}. Remind survivor to use walkable staircases to reach 2nd/3rd floor skybridges and snipe the 10% Hard Creepy Fiends.`,
        }),
      });
      const data = await res.json();
      if (data.text) {
        setRadioCallout(data.text);
      }
    } catch {
      // Keep local callout
    }
  }, []);

  const triggerReload = useCallback(() => {
    if (isReloadingRef.current) return;
    const stats = computeWeaponStats(
      equippedWeaponRef.current,
      weaponLevelsRef.current[equippedWeaponRef.current] || 1
    );
    if (ammoInMagRef.current >= stats.capacity) return;

    setIsReloading(true);
    isReloadingRef.current = true;
    soundEngine.playPickup();

    setTimeout(() => {
      setAmmoInMag(stats.capacity);
      ammoInMagRef.current = stats.capacity;
      setIsReloading(false);
      isReloadingRef.current = false;
    }, stats.reloadSec * 1000);
  }, []);

  const handleUseInventoryItem = useCallback((type: PickupType) => {
    setInventory((prev) => {
      const current = prev[type] || 0;
      if (current <= 0) return prev;
      return { ...prev, [type]: current - 1 };
    });

    soundEngine.playPickup();
    const now = performance.now();

    if (type === 'medkit_small') {
      setHp((h) => Math.min(100, h + 30));
    } else if (type === 'medkit_large') {
      setHp((h) => Math.min(100, h + 75));
      setStamina(100);
    } else if (type === 'armor_vest') {
      setArmor((a) => Math.min(100, a + 50));
    } else if (type === 'energy_cell') {
      const stats = computeWeaponStats(
        equippedWeaponRef.current,
        weaponLevelsRef.current[equippedWeaponRef.current] || 1
      );
      setAmmoInMag(stats.capacity);
    } else if (type === 'speed_booster') {
      setSpeedBoostUntil(now + 15000);
    } else if (type === 'damage_enhancer') {
      setDamageBoostUntil(now + 15000);
    } else if (type === 'scrap_cache') {
      setScrap((s) => s + 85);
    }
  }, []);

  const spawnPickupAt = useCallback((type: PickupType, x: number, y: number, z: number) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const spec = PICKUP_CATALOG[type];
    const group = new THREE.Group();

    const baseOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.colorHex),
        emissive: new THREE.Color(spec.colorHex),
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.5,
      })
    );
    baseOrb.position.y = 0.65;
    group.add(baseOrb);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(spec.colorHex),
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    group.position.set(x, y, z);
    scene.add(group);

    pickupsRef.current.push({
      id: `pk_${Date.now()}_${Math.random()}`,
      type,
      mesh: group,
      x,
      y,
      z,
    });
  }, []);

  // Spawn a Boss Titan
  const spawnBoss = useCallback((bossId: BossId) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const spec = BOSS_SPECS[bossId];
    const rig = createBossRig(bossId);
    const sx = 0;
    const sz = -22;
    rig.root.position.set(sx, 0, sz);
    scene.add(rig.root);

    const bossEntity: ActiveZombie = {
      id: `boss_${bossId}_${Date.now()}`,
      isBoss: true,
      creepyTier: 'hard',
      bossId,
      name: spec.name,
      hp: spec.baseHp,
      maxHp: spec.baseHp,
      speed: spec.speed,
      damage: spec.attackDamage,
      attackRange: spec.attackRange,
      scoreReward: spec.scoreReward,
      scrapReward: spec.scrapReward,
      rig,
      x: sx,
      y: 0,
      z: sz,
      yaw: 0,
      lastAttackAt: 0,
      strafeSeed: Math.random() * 10,
    };

    zombiesRef.current.push(bossEntity);
    setActiveBossBanner({
      name: spec.name,
      subtitle: spec.subtitle,
      hp: spec.baseHp,
      maxHp: spec.baseHp,
    });
    soundEngine.playBossRoar();
    setRadioCallout(`ALERT: ${spec.name} (${spec.subtitle}) has breached Central Block B!`);
  }, []);

  // Spawn a Creepy Zombie using exact 70% Low / 20% Mid / 10% Hard probabilities
  const spawnCreepyZombieEntity = useCallback((nearPlayer = false) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const tier = rollCreepyZombieTier();
    const tierSpec = CREEPY_ZOMBIE_TIERS[tier];
    const zClass = pickZombieClassForTier(tier, waveRef.current);
    const classSpec = ZOMBIE_CLASS_SPECS[zClass];

    setCreepySpawnCounts((prev) => ({
      ...prev,
      [tier]: prev[tier] + 1,
    }));

    const waveDef = getWaveDefinition(
      waveRef.current,
      difficultyRef.current,
      gameModeRef.current,
      coopBotsCount + 1
    );

    const rig = createZombieRig(zClass, tier);
    let sx = 0;
    let sz = -30;
    let sy = 0;

    if (nearPlayer) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 16;
      sx = Math.max(-82, Math.min(82, playerPosRef.current.x + Math.cos(angle) * dist));
      sz = Math.max(-70, Math.min(68, playerPosRef.current.z + Math.sin(angle) * dist));
      sy = playerPosRef.current.y;
    } else {
      const pts = spawnPointsRef.current;
      const pt = pts[Math.floor(Math.random() * pts.length)] || { x: 0, z: -40 };
      sx = pt.x + (Math.random() - 0.5) * 6;
      sz = pt.z + (Math.random() - 0.5) * 6;
      sy = 0;
    }

    rig.root.position.set(sx, sy, sz);
    scene.add(rig.root);

    const scaledHp = Math.round(classSpec.baseHp * tierSpec.hpMultiplier * waveDef.hpMultiplier);
    const scaledSpeed = Number(
      (classSpec.baseSpeed * tierSpec.speedMultiplier * waveDef.speedMultiplier).toFixed(2)
    );
    const scaledDmg = Math.round(classSpec.attackDamage * tierSpec.damageMultiplier);

    zombiesRef.current.push({
      id: `z_${Date.now()}_${Math.random()}`,
      isBoss: false,
      zombieClass: zClass,
      creepyTier: tier,
      name: `${tierSpec.label} • ${classSpec.name}`,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: scaledSpeed,
      damage: scaledDmg,
      attackRange: classSpec.attackRange,
      scoreReward: classSpec.scoreReward + tierSpec.scoreBonus,
      scrapReward: classSpec.scrapReward + tierSpec.scrapBonus,
      rig,
      x: sx,
      y: sy,
      z: sz,
      yaw: 0,
      lastAttackAt: 0,
      strafeSeed: Math.random() * Math.PI * 2,
    });
  }, [coopBotsCount]);

  // Rebuild Allied Co-Op Bots
  const syncAlliedBots = useCallback((count: number) => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const b of botsRef.current) {
      scene.remove(b.rig.root);
    }
    botsRef.current = [];

    const botPalettes = [
      { name: 'Alpha-2 (Sniper Recon)', suit: '#059669', visor: '#6ee7b7', cat: 'Sniper' as const },
      { name: 'Bravo-3 (Breacher)', suit: '#d97706', visor: '#fef08a', cat: 'Shotgun' as const },
      { name: 'Delta-4 (Suppressor)', suit: '#7c3aed', visor: '#c4b5fd', cat: 'Long-Range' as const },
    ];

    for (let i = 0; i < count; i++) {
      const pal = botPalettes[i % botPalettes.length];
      const rig = createSurvivorRig(pal.suit, pal.visor, pal.cat, pal.visor);
      const bx = playerPosRef.current.x + (i === 0 ? -3.5 : i === 1 ? 3.5 : 0);
      const bz = playerPosRef.current.z + (i === 2 ? 3.5 : 1.5);
      rig.root.position.set(bx, playerPosRef.current.y, bz);
      scene.add(rig.root);
      botsRef.current.push({
        id: `bot_${i}`,
        name: pal.name,
        rig,
        x: bx,
        y: playerPosRef.current.y,
        z: bz,
        yaw: 0,
        lastShotAt: 0,
      });
    }
  }, []);

  // Start or Reset a Game Session
  const startGameSession = useCallback(
    (selectedMode?: GameMode, selectedDiff?: DifficultyPreset) => {
      const m = selectedMode || gameMode;
      const d = selectedDiff || difficulty;
      if (selectedMode) setGameMode(selectedMode);
      if (selectedDiff) setDifficulty(selectedDiff);

      soundEngine.init();
      const scene = sceneRef.current;
      if (scene) {
        for (const z of zombiesRef.current) scene.remove(z.rig.root);
        for (const p of projectilesRef.current) scene.remove(p.mesh);
        for (const pk of pickupsRef.current) scene.remove(pk.mesh);
      }
      zombiesRef.current = [];
      projectilesRef.current = [];
      pickupsRef.current = [];

      playerPosRef.current = { x: 0, y: 0, z: 14, yaw: 0 };
      cameraYawRef.current = 0;
      if (playerRigRef.current) {
        playerRigRef.current.root.position.set(0, 0, 14);
        playerRigRef.current.root.rotation.y = 0;
      }

      setHp(100);
      setArmor(50);
      setStamina(100);
      setScore(0);
      setScrap(320);
      setWave(1);
      setPlayerElevation(0);
      setOnStairsFlag(false);
      setActiveBossBanner(null);
      setCreepySpawnCounts({ low: 0, mid: 0, hard: 0 });
      timesDownedRef.current = 0;

      const wave1 = getWaveDefinition(1, d, m, coopBotsCount + 1);
      waveTargetCountRef.current = wave1.totalZombies;
      spawnedInWaveRef.current = 0;
      setZombiesRemaining(wave1.totalZombies);

      const pLocs = pickupLocationsRef.current;
      const pTypes: PickupType[] = [
        'medkit_small',
        'energy_cell',
        'armor_vest',
        'scrap_cache',
        'speed_booster',
        'damage_enhancer',
        'mystery_crate',
      ];
      pLocs.forEach((loc, idx) => {
        spawnPickupAt(pTypes[idx % pTypes.length], loc.x, loc.y || 0, loc.z);
      });

      syncAlliedBots(m === 'coop' ? Math.max(2, coopBotsCount) : coopBotsCount);

      // Immediately spawn an initial pack of Creepy Zombies (70% Low / 20% Mid / 10% Hard)
      for (let i = 0; i < 5; i++) {
        spawnedInWaveRef.current += 1;
        setTimeout(() => spawnCreepyZombieEntity(true), i * 120);
      }

      setAppState('playing');
      appStateRef.current = 'playing';
      fetchWaveCallout(1, '08_Quadrangle_Badminton');
    },
    [
      gameMode,
      difficulty,
      coopBotsCount,
      spawnPickupAt,
      syncAlliedBots,
      fetchWaveCallout,
      spawnCreepyZombieEntity,
    ]
  );

  // Initialize Three.js WebGL Viewport & 180m x 160m Campus Environment
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b121e);
    scene.fog = new THREE.FogExp2(0x0b121e, 0.006);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.15,
      360
    );
    camera.position.set(0, 7, 24);
    cameraRef.current = camera;

    // First-Person POV weapon holder attached to camera
    const fppHolder = new THREE.Group();
    camera.add(fppHolder);
    scene.add(camera);
    fppHolderRef.current = fppHolder;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      document.body.dataset.ready = 'true';
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfef08a, 1.35);
    dirLight.position.set(48, 72, 36);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 210;
      const d = 85;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
    }
    scene.add(dirLight);

    // Build Campus 3D Visual Atlas with Enterable Buildings & Walkable Staircases
    const campus = buildCampusEnvironment(scene);
    collidersRef.current = campus.colliders;
    walls3DRef.current = campus.walls3D;
    stairsRef.current = campus.stairs;
    floorsRef.current = campus.floors;
    spawnPointsRef.current = campus.spawnPoints;
    pickupLocationsRef.current = campus.pickupLocations;

    // Create Survivor 3D Rig & initial FPP weapon mesh
    const starterSpec = WEAPON_SPECS[equippedWeaponRef.current];
    const survivorRig = createSurvivorRig(
      suitColor,
      visorColor,
      starterSpec.category,
      starterSpec.colorHex
    );
    survivorRig.root.position.set(0, 0, 14);
    scene.add(survivorRig.root);
    playerRigRef.current = survivorRig;

    const { weaponGroup: initFppGun } = buildCustomWeaponMesh(
      starterSpec.category,
      starterSpec.colorHex
    );
    initFppGun.position.set(0.28, -0.24, -0.35);
    initFppGun.scale.setScalar(0.95);
    fppHolder.add(initFppGun);

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setTimeout(() => startGameSession(), 50);
    }

    document.body.dataset.ready = 'true';

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard & Mouse Listeners — Fixing Right Arrow (`ArrowRight`) & Left Arrow (`ArrowLeft`) explicitly!
    const onKeyDown = (e: KeyboardEvent) => {
      // Store both exact e.code ('ArrowRight', 'ArrowLeft', 'KeyW', etc.) and lowercase e.key
      keysRef.current[e.code] = true;
      keysRef.current[e.key] = true;
      keysRef.current[e.key.toLowerCase()] = true;

      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
      }

      if (appStateRef.current !== 'playing') return;

      if (e.code === 'KeyR') {
        triggerReload();
      } else if (e.code === 'KeyV') {
        setPovMode((m) => (m === 'tpp' ? 'fpp' : 'tpp'));
      } else if (e.code === 'KeyZ') {
        setIsZoomed((z) => !z);
      } else if (e.code === 'KeyM') {
        setMinimapExpanded((v) => !v);
      } else if (e.code === 'KeyU' || e.code === 'KeyI') {
        setArmoryModalOpen((v) => !v);
      } else if (e.code === 'KeyT') {
        setAiModalOpen((v) => !v);
      } else if (e.code === 'KeyB') {
        spawnBoss('final_boss_wave10');
      } else if (e.code === 'KeyC') {
        spawnCreepyZombieEntity(true);
      } else if (e.code === 'Escape') {
        setArmoryModalOpen(false);
        setAiModalOpen(false);
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        const allIds = Object.keys(WEAPON_SPECS) as WeaponId[];
        const targetW = allIds[idx];
        if (targetW) {
          setUnlockedWeapons((prev) => (prev.includes(targetW) ? prev : [...prev, targetW]));
          setEquippedWeapon(targetW);
          const st = computeWeaponStats(targetW, weaponLevelsRef.current[targetW] || 1);
          setAmmoInMag(st.capacity);
        }
      } else if (e.key === '0') {
        const allIds = Object.keys(WEAPON_SPECS) as WeaponId[];
        const targetW = allIds[9];
        if (targetW) {
          setUnlockedWeapons((prev) => (prev.includes(targetW) ? prev : [...prev, targetW]));
          setEquippedWeapon(targetW);
          const st = computeWeaponStats(targetW, weaponLevelsRef.current[targetW] || 1);
          setAmmoInMag(st.capacity);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      keysRef.current[e.key] = false;
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (appStateRef.current !== 'playing') return;
      if (e.buttons === 1 || e.buttons === 2 || document.pointerLockElement) {
        const sens = isZoomedRef.current ? 0.0022 : 0.0045;
        cameraYawRef.current -= e.movementX * sens;
        cameraPitchRef.current = Math.max(
          -0.45,
          Math.min(0.68, cameraPitchRef.current - e.movementY * (sens * 0.7))
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (appStateRef.current !== 'playing') return;
      if (e.button === 0) {
        mouseDownRef.current = true;
      } else if (e.button === 2) {
        setIsZoomed((z) => !z);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseDownRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (appStateRef.current !== 'playing') return;
      if (e.deltaY < 0) {
        setIsZoomed(true);
      } else if (e.deltaY > 0) {
        setIsZoomed(false);
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel);
    window.addEventListener('contextmenu', onContextMenu);

    // Paced Animation Loop
    let disposed = false;
    let rafId = 0;
    let lastTime = performance.now();
    let minimapTick = 0;

    const afterDraw = isSoftwareGl
      ? (cb: () => void) => setTimeout(cb, 16)
      : (cb: () => void) => cb();

    const fireProjectile = (
      originX: number,
      originY: number,
      originZ: number,
      yaw: number,
      pitch: number,
      wId: WeaponId,
      lvl: number,
      fromPlayer: boolean
    ) => {
      const spec = WEAPON_SPECS[wId];
      const stats = computeWeaponStats(wId, lvl);
      const dmgMult = fromPlayer && performance.now() < damageBoostUntilRef.current ? 1.5 : 1.0;

      for (let i = 0; i < spec.pellets; i++) {
        const spreadYaw = yaw + (Math.random() - 0.5) * spec.spreadRad * 2;
        const spreadPitch = pitch + (Math.random() - 0.5) * spec.spreadRad;
        const vx = -Math.sin(spreadYaw) * Math.cos(spreadPitch) * spec.projectileSpeed;
        const vy = Math.sin(spreadPitch) * spec.projectileSpeed;
        const vz = -Math.cos(spreadYaw) * Math.cos(spreadPitch) * spec.projectileSpeed;

        const bolt = new THREE.Mesh(
          new THREE.SphereGeometry(spec.category === 'Sniper' ? 0.16 : 0.12, 6, 6),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(spec.colorHex) })
        );
        bolt.position.set(originX, originY, originZ);
        scene.add(bolt);

        projectilesRef.current.push({
          id: `proj_${Date.now()}_${Math.random()}`,
          mesh: bolt,
          x: originX,
          y: originY,
          z: originZ,
          vx,
          vy,
          vz,
          damage: Math.round(stats.damage * dmgMult),
          maxDist: spec.rangeMeters,
          traveled: 0,
          fromPlayer,
        });
      }

      if (fromPlayer) {
        shotsFiredRef.current += 1;
        soundEngine.playLaserShot(
          spec.category === 'Sniper' ? 'rail' : spec.category === 'Shotgun' ? 'scatter' : 'pulse'
        );
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeSec = now * 0.001;

      if (campus.animatedProps.flagMesh) {
        campus.animatedProps.flagMesh.rotation.y = Math.sin(timeSec * 3.0) * 0.18;
      }

      if (appStateRef.current === 'title') {
        const orbitAngle = timeSec * 0.16;
        camera.fov = 60;
        camera.updateProjectionMatrix();
        if (fppHolderRef.current) fppHolderRef.current.visible = false;
        if (playerRigRef.current) playerRigRef.current.root.visible = true;
        camera.position.set(Math.sin(orbitAngle) * 52, 26, Math.cos(orbitAngle) * 52);
        camera.lookAt(0, 3, -8);
        renderer.render(scene, camera);
        afterDraw(() => {
          rafId = requestAnimationFrame(tick);
        });
        return;
      }

      if (appStateRef.current === 'playing') {
        const keys = keysRef.current;

        // 1. RIGHT ARROW & LEFT ARROW VIEW ROTATION (Fixed & Responsive!)
        const turnLeft =
          Boolean(keys['ArrowLeft']) ||
          Boolean(keys['arrowleft']) ||
          Boolean(keys['KeyQ']) ||
          Boolean(keys['q']);
        const turnRight =
          Boolean(keys['ArrowRight']) ||
          Boolean(keys['arrowright']) ||
          Boolean(keys['KeyE']) ||
          Boolean(keys['e']);

        const turnSpeed = isZoomedRef.current ? 1.45 : 2.45;
        if (turnLeft) cameraYawRef.current += turnSpeed * dt;
        if (turnRight) cameraYawRef.current -= turnSpeed * dt;

        // 2. Player Movement + 3D Staircase & Wall Resolution
        let moveForward = 0;
        let moveRight = 0;
        if (keys['KeyW'] || keys['w'] || keys['ArrowUp'] || keys['arrowup']) moveForward += 1;
        if (keys['KeyS'] || keys['s'] || keys['ArrowDown'] || keys['arrowdown']) moveForward -= 1;
        if (keys['KeyD'] || keys['d']) moveRight += 1;
        if (keys['KeyA'] || keys['a']) moveRight -= 1;

        const isSprinting =
          (keys['ShiftLeft'] || keys['ShiftRight'] || keys['shift']) && staminaRef.current > 5;
        const speedBoostMult = now < speedBoostUntilRef.current ? 1.3 : 1.0;
        const baseSpeed = (isSprinting ? 11.8 : 8.2) * speedBoostMult;

        let speedRatio = 0;
        if (moveForward !== 0 || moveRight !== 0) {
          const len = Math.hypot(moveForward, moveRight);
          const nf = moveForward / len;
          const nr = moveRight / len;
          const yaw = cameraYawRef.current;

          const dx = (-Math.sin(yaw) * nf + Math.cos(yaw) * nr) * baseSpeed * dt;
          const dz = (-Math.cos(yaw) * nf - Math.sin(yaw) * nr) * baseSpeed * dt;

          const resolved3D = resolve3DMovement(
            playerPosRef.current.x + dx,
            playerPosRef.current.y,
            playerPosRef.current.z + dz,
            0.55,
            walls3DRef.current,
            stairsRef.current,
            floorsRef.current
          );
          playerPosRef.current.x = resolved3D.x;
          playerPosRef.current.y = resolved3D.y;
          playerPosRef.current.z = resolved3D.z;
          playerPosRef.current.yaw = Math.atan2(-dx, -dz);
          speedRatio = isSprinting ? 1.35 : 1.0;

          if (Math.abs(resolved3D.y - playerElevation) > 0.05) {
            setPlayerElevation(resolved3D.y);
          }
          if (resolved3D.onStairs !== onStairsFlag) {
            setOnStairsFlag(resolved3D.onStairs);
          }

          if (isSprinting) {
            setStamina((s) => Math.max(0, s - 20 * dt));
          }
        } else {
          setStamina((s) => Math.min(100, s + 16 * dt));
        }

        // Aim orientation when firing or in First-Person / Zoom mode
        if (mouseDownRef.current || povModeRef.current === 'fpp' || isZoomedRef.current) {
          playerPosRef.current.yaw = cameraYawRef.current;
        }

        if (playerRigRef.current) {
          playerRigRef.current.root.position.set(
            playerPosRef.current.x,
            playerPosRef.current.y,
            playerPosRef.current.z
          );
          playerRigRef.current.root.rotation.y = playerPosRef.current.yaw;
          animateCharacterRig(playerRigRef.current, timeSec, speedRatio, false);
        }

        // 3. Camera POV (First-Person POV / Scope Zoom vs Third-Person POV)
        const wSpec = WEAPON_SPECS[equippedWeaponRef.current];
        const effectiveFpp = povModeRef.current === 'fpp' || isZoomedRef.current;
        const targetFov = isZoomedRef.current
          ? wSpec.zoomFov
          : povModeRef.current === 'fpp'
          ? 70
          : 60;
        camera.fov += (targetFov - camera.fov) * 0.22;
        camera.updateProjectionMatrix();

        const camYaw = cameraYawRef.current;
        const camPitch = cameraPitchRef.current;

        if (effectiveFpp) {
          if (playerRigRef.current) playerRigRef.current.root.visible = false;
          if (fppHolderRef.current) {
            fppHolderRef.current.visible = !(isZoomedRef.current && wSpec.hasScopeOverlay);
            // Subtle weapon bob in First-Person POV
            fppHolderRef.current.position.y = Math.sin(timeSec * 8) * 0.012 * speedRatio;
          }
          const eyeY = playerPosRef.current.y + 1.58;
          camera.position.set(playerPosRef.current.x, eyeY, playerPosRef.current.z);
          const lookDist = 30;
          camera.lookAt(
            playerPosRef.current.x - Math.sin(camYaw) * Math.cos(camPitch) * lookDist,
            eyeY + Math.sin(camPitch) * lookDist - 4.0,
            playerPosRef.current.z - Math.cos(camYaw) * Math.cos(camPitch) * lookDist
          );
        } else {
          if (playerRigRef.current) playerRigRef.current.root.visible = true;
          if (fppHolderRef.current) fppHolderRef.current.visible = false;

          const camDist = 8.4;
          const camHeight = 4.5 + camPitch * 5.0;
          const targetCamX =
            playerPosRef.current.x + Math.sin(camYaw) * camDist + Math.cos(camYaw) * 0.85;
          const targetCamZ =
            playerPosRef.current.z + Math.cos(camYaw) * camDist - Math.sin(camYaw) * 0.85;
          const targetCamY = playerPosRef.current.y + camHeight;

          camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.22);
          camera.lookAt(
            playerPosRef.current.x - Math.sin(camYaw) * 6,
            playerPosRef.current.y + 1.45,
            playerPosRef.current.z - Math.cos(camYaw) * 6
          );
        }

        // 4. Weapon Firing (Left Mouse or Spacebar)
        const wantsShoot = mouseDownRef.current || Boolean(keys['Space']) || Boolean(keys[' ']);
        if (wantsShoot && !isReloadingRef.current) {
          const wId = equippedWeaponRef.current;
          const lvl = weaponLevelsRef.current[wId] || 1;
          const stats = computeWeaponStats(wId, lvl);
          if (now - lastShotTimeRef.current >= stats.fireIntervalMs) {
            if (ammoInMagRef.current > 0) {
              lastShotTimeRef.current = now;
              const nextAmmo = ammoInMagRef.current - 1;
              ammoInMagRef.current = nextAmmo;
              setAmmoInMag(nextAmmo);

              // Compute pitch aim toward nearest zombie on screen or camera pitch
              let aimPitch = effectiveFpp ? camPitch - 0.12 : 0;
              fireProjectile(
                playerPosRef.current.x - Math.sin(camYaw) * 0.65,
                playerPosRef.current.y + 1.38,
                playerPosRef.current.z - Math.cos(camYaw) * 0.65,
                camYaw,
                aimPitch,
                wId,
                lvl,
                true
              );
              if (nextAmmo <= 0) {
                triggerReload();
              }
            } else {
              triggerReload();
            }
          }
        }

        // 5. Wave & Random Creepy Zombie Spawner (70% Low / 20% Mid / 10% Hard)
        const waveDef = getWaveDefinition(
          waveRef.current,
          difficultyRef.current,
          gameModeRef.current,
          coopBotsCount + 1
        );

        if (
          spawnedInWaveRef.current < waveTargetCountRef.current &&
          zombiesRef.current.length < waveDef.maxConcurrent &&
          now - lastSpawnTimeRef.current >= waveDef.spawnIntervalMs
        ) {
          lastSpawnTimeRef.current = now;
          spawnedInWaveRef.current += 1;
          spawnCreepyZombieEntity(false);
        }

        // Ambient random creepy zombie ambush every 9 seconds so the campus feels alive & eerie
        if (zombiesRef.current.length < 18 && now - lastRandomCreepySpawnRef.current >= 9000) {
          lastRandomCreepySpawnRef.current = now;
          spawnCreepyZombieEntity(true);
        }

        // 6. Update Zombies (3D staircase climbing + side-weaving skill behavior for Mid/Hard creepy tiers)
        for (const z of zombiesRef.current) {
          const dx = playerPosRef.current.x - z.x;
          const dz = playerPosRef.current.z - z.z;
          const dist = Math.hypot(dx, dz);
          const elevDiff = Math.abs(playerPosRef.current.y - z.y);

          if (dist > 0.01) {
            let dirX = dx / dist;
            let dirZ = dz / dist;

            // Mid (20%) & Hard (10%) creepy zombies weave laterally, requiring player aim skill!
            if (z.creepyTier === 'mid' || z.creepyTier === 'hard') {
              const weave =
                Math.sin(timeSec * (z.creepyTier === 'hard' ? 5.5 : 3.8) + z.strafeSeed) *
                (z.creepyTier === 'hard' ? 0.48 : 0.32);
              const perpX = -dirZ;
              const perpZ = dirX;
              dirX += perpX * weave;
              dirZ += perpZ * weave;
            }

            // Hard (10%) creepy zombies regenerate slightly if not burst down quickly
            if (z.creepyTier === 'hard' && !z.isBoss && z.hp < z.maxHp) {
              z.hp = Math.min(z.maxHp, z.hp + 3.5 * dt);
            }

            if (dist > z.attackRange * 0.8 || elevDiff > 1.8) {
              const stepX = z.x + dirX * z.speed * dt;
              const stepZ = z.z + dirZ * z.speed * dt;
              const resZ = resolve3DMovement(
                stepX,
                z.y,
                stepZ,
                z.isBoss ? 1.15 : 0.48,
                walls3DRef.current,
                stairsRef.current,
                floorsRef.current
              );
              z.x = resZ.x;
              z.y = resZ.y;
              z.z = resZ.z;
            }

            z.yaw = Math.atan2(-dx, -dz);
            z.rig.root.position.set(z.x, z.y, z.z);
            z.rig.root.rotation.y = z.yaw;
            animateCharacterRig(z.rig, timeSec, 1.0, true);
          }

          // Attack player if on same floor and within attackRange
          if (dist <= z.attackRange && elevDiff <= 1.8 && now - z.lastAttackAt >= 1100) {
            z.lastAttackAt = now;
            const dmgResult = applyDamageWithArmor(hpRef.current, armorRef.current, z.damage);
            hpRef.current = dmgResult.remainingHp;
            armorRef.current = dmgResult.remainingArmor;
            setHp(dmgResult.remainingHp);
            setArmor(dmgResult.remainingArmor);
            soundEngine.playDamageHit();
            setDamageFlash(true);
            setTimeout(() => setDamageFlash(false), 180);

            if (dmgResult.isDowned) {
              timesDownedRef.current += 1;
              if (botsRef.current.length > 0 && timesDownedRef.current <= 2) {
                hpRef.current = 60;
                setHp(60);
                setRadioCallout('SQUAD REVIVE: Allied Defender revived you with 60 HP!');
              } else {
                setAppState('gameover');
                appStateRef.current = 'gameover';
              }
            }
          }
        }

        // 7. Allied Co-Op Bots AI
        for (const bot of botsRef.current) {
          const bdx = playerPosRef.current.x - bot.x;
          const bdz = playerPosRef.current.z - bot.z;
          const bDist = Math.hypot(bdx, bdz);
          if (bDist > 5.0) {
            const resB = resolve3DMovement(
              bot.x + (bdx / bDist) * 7.2 * dt,
              bot.y,
              bot.z + (bdz / bDist) * 7.2 * dt,
              0.45,
              walls3DRef.current,
              stairsRef.current,
              floorsRef.current
            );
            bot.x = resB.x;
            bot.y = resB.y;
            bot.z = resB.z;
            bot.yaw = Math.atan2(-bdx, -bdz);
            animateCharacterRig(bot.rig, timeSec, 0.9, false);
          } else {
            animateCharacterRig(bot.rig, timeSec, 0, false);
          }
          bot.rig.root.position.set(bot.x, bot.y, bot.z);
          bot.rig.root.rotation.y = bot.yaw;

          if (zombiesRef.current.length > 0 && now - bot.lastShotAt >= 680) {
            let nearest: ActiveZombie | null = null;
            let minD = 32;
            for (const z of zombiesRef.current) {
              const d = Math.hypot(z.x - bot.x, z.z - bot.z);
              if (d < minD) {
                minD = d;
                nearest = z;
              }
            }
            if (nearest) {
              bot.lastShotAt = now;
              const aimYaw = Math.atan2(-(nearest.x - bot.x), -(nearest.z - bot.z));
              bot.rig.root.rotation.y = aimYaw;
              fireProjectile(
                bot.x,
                bot.y + 1.3,
                bot.z,
                aimYaw,
                0,
                'mid_assault_carbine',
                1,
                false
              );
            }
          }
        }

        // 8. Projectiles & Hit Detection (3D elevation-aware)
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          const stepDist = Math.hypot(p.vx * dt, p.vy * dt, p.vz * dt);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.traveled += stepDist;
          p.mesh.position.set(p.x, p.y, p.z);

          let hit = false;
          for (let j = zombiesRef.current.length - 1; j >= 0; j--) {
            const z = zombiesRef.current[j];
            const hitRadius = z.isBoss ? 2.3 : 1.05;
            const zHeight = z.isBoss ? 3.5 : 2.1;
            if (
              Math.hypot(p.x - z.x, p.z - z.z) <= hitRadius &&
              p.y >= z.y - 0.5 &&
              p.y <= z.y + zHeight
            ) {
              hit = true;
              z.hp -= p.damage;
              if (p.fromPlayer) {
                shotsHitRef.current += 1;
                soundEngine.playZombieHit();
              }

              const tierSpec = CREEPY_ZOMBIE_TIERS[z.creepyTier];
              setLastTargetedZombieInfo({
                name: z.name,
                tierLabel: tierSpec.difficultyTag,
                tierColor: tierSpec.colorHex,
                hp: Math.max(0, Math.round(z.hp)),
                maxHp: z.maxHp,
              });

              if (z.isBoss) {
                setActiveBossBanner((prev) =>
                  prev ? { ...prev, hp: Math.max(0, z.hp) } : null
                );
              }

              if (z.hp <= 0) {
                scene.remove(z.rig.root);
                zombiesRef.current.splice(j, 1);

                setScore((s) => s + z.scoreReward);
                setScrap((sc) => sc + z.scrapReward);
                setTotalKills((k) => k + 1);

                if (z.isBoss) {
                  setBossesDefeated((b) => b + 1);
                  setActiveBossBanner(null);
                  spawnPickupAt('mystery_crate', z.x, z.y, z.z);
                } else if (Math.random() < 0.34) {
                  const dropPool: PickupType[] = [
                    'medkit_small',
                    'energy_cell',
                    'scrap_cache',
                    'armor_vest',
                  ];
                  spawnPickupAt(
                    dropPool[Math.floor(Math.random() * dropPool.length)],
                    z.x,
                    z.y,
                    z.z
                  );
                }

                // Check Wave Completion
                const rem =
                  Math.max(0, waveTargetCountRef.current - spawnedInWaveRef.current) +
                  zombiesRef.current.length;
                setZombiesRemaining(rem);

                if (
                  rem === 0 &&
                  spawnedInWaveRef.current >= waveTargetCountRef.current
                ) {
                  const nextW = waveRef.current + 1;
                  waveRef.current = nextW;
                  setWave(nextW);
                  setHighestWave((hw) => Math.max(hw, nextW));
                  soundEngine.playWaveComplete();

                  const nextDef = getWaveDefinition(
                    nextW,
                    difficultyRef.current,
                    gameModeRef.current,
                    coopBotsCount + 1
                  );
                  waveTargetCountRef.current = nextDef.totalZombies;
                  spawnedInWaveRef.current = 0;
                  setZombiesRemaining(nextDef.totalZombies);

                  if (nextDef.bossToSpawn) {
                    spawnBoss(nextDef.bossToSpawn);
                  }
                  const zSpec = findCampusZoneAtPosition(
                    playerPosRef.current.x,
                    playerPosRef.current.z
                  );
                  fetchWaveCallout(nextW, zSpec.nodeGroupName);
                }
              }
              break;
            }
          }

          if (hit || p.traveled >= p.maxDist) {
            scene.remove(p.mesh);
            projectilesRef.current.splice(i, 1);
          }
        }

        // 9. Pickup Collection
        for (let i = pickupsRef.current.length - 1; i >= 0; i--) {
          const pk = pickupsRef.current[i];
          pk.mesh.rotation.y += 2.2 * dt;
          if (
            Math.hypot(playerPosRef.current.x - pk.x, playerPosRef.current.z - pk.z) <= 2.3 &&
            Math.abs(playerPosRef.current.y - pk.y) <= 2.0
          ) {
            scene.remove(pk.mesh);
            pickupsRef.current.splice(i, 1);
            soundEngine.playPickup();

            if (pk.type === 'mystery_crate') {
              const highTierPool: WeaponId[] = [
                'sniper_bolt',
                'sniper_thermal_dmr',
                'sniper_gauss_rail',
                'shotgun_autodrum',
                'long_heavy_lmg',
                'scar_x_projector',
              ];
              const chosen = highTierPool[Math.floor(Math.random() * highTierPool.length)];
              setUnlockedWeapons((prev) => (prev.includes(chosen) ? prev : [...prev, chosen]));
              setEquippedWeapon(chosen);
              setScrap((s) => s + 120);
              setRadioCallout(
                `SUPPLY CRATE UNLOCKED: Equipped ${WEAPON_SPECS[chosen].name} (${WEAPON_SPECS[chosen].category})!`
              );
            } else if (pk.type === 'scrap_cache') {
              setScrap((s) => s + 85);
            } else {
              setInventory((prev) => ({
                ...prev,
                [pk.type]: (prev[pk.type] || 0) + 1,
              }));
            }
          }
        }

        // 10. Periodic HUD & Minimap Telemetry Sync
        minimapTick += dt;
        if (minimapTick >= 0.25) {
          minimapTick = 0;
          setPlayerCoords({
            x: playerPosRef.current.x,
            z: playerPosRef.current.z,
            yaw: playerPosRef.current.yaw,
          });

          const zone = findCampusZoneAtPosition(
            playerPosRef.current.x,
            playerPosRef.current.z
          );
          setCurrentZoneName(zone.nodeGroupName);
          setCurrentZoneDisplay(zone.displayName);

          const acc =
            shotsFiredRef.current > 0
              ? shotsHitRef.current / shotsFiredRef.current
              : 0.5;
          const dirAdj = evaluateDynamicDifficulty({
            playerHpRatio: hpRef.current / 100,
            recentKillsPerMin: 16,
            playerAccuracyRatio: acc,
            timesDowned: timesDownedRef.current,
          });
          setDirectorLabel(dirAdj.directorStateLabel);

          const ents: MinimapEntity[] = [
            ...zombiesRef.current.map((z) => ({
              x: z.x,
              z: z.z,
              type: (z.isBoss ? 'boss' : 'zombie') as 'boss' | 'zombie',
            })),
            ...pickupsRef.current.map((pk) => ({
              x: pk.x,
              z: pk.z,
              type: (pk.type === 'mystery_crate' ? 'crate' : 'loot') as 'crate' | 'loot',
            })),
            ...botsRef.current.map((b) => ({
              x: b.x,
              z: b.z,
              type: 'teammate' as const,
            })),
          ];
          setMinimapEntities(ents);
        }
      }

      renderer.render(scene, camera);
      afterDraw(() => {
        rafId = requestAnimationFrame(tick);
      });
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, [
    coopBotsCount,
    fetchWaveCallout,
    spawnBoss,
    spawnCreepyZombieEntity,
    spawnPickupAt,
    startGameSession,
    suitColor,
    triggerReload,
    visorColor,
  ]);

  // Update 3D player weapon model whenever equippedWeapon or suit changes
  useEffect(() => {
    rebuildPlayerWeaponsAppearance(equippedWeapon, suitColor, visorColor);
  }, [equippedWeapon, suitColor, visorColor, rebuildPlayerWeaponsAppearance]);

  const handleUnlockOrUpgradeWeapon = (wId: WeaponId) => {
    const spec = WEAPON_SPECS[wId];
    const isUnlocked = unlockedWeapons.includes(wId);
    if (!isUnlocked) {
      if (scrap < spec.unlockCost) return;
      setScrap((s) => s - spec.unlockCost);
      setUnlockedWeapons((prev) => [...prev, wId]);
      setEquippedWeapon(wId);
      soundEngine.playPickup();
      return;
    }
    const curLvl = weaponLevels[wId] || 1;
    const stats = computeWeaponStats(wId, curLvl);
    if (stats.nextUpgradeCost !== null && scrap >= stats.nextUpgradeCost) {
      setScrap((s) => s - stats.nextUpgradeCost!);
      setWeaponLevels((prev) => ({ ...prev, [wId]: curLvl + 1 }));
      soundEngine.playPickup();
    }
  };

  const currentWeaponSpec = WEAPON_SPECS[equippedWeapon];
  const currentWeaponStats = computeWeaponStats(
    equippedWeapon,
    weaponLevels[equippedWeapon] || 1
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Viewport Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* Red Damage Vignette Flash */}
      {damageFlash && (
        <div className="pointer-events-none fixed inset-0 z-20 border-[12px] border-rose-600/70 bg-rose-950/25" />
      )}

      {/* Optical Sniper / Scope Zoom Reticle Overlay */}
      {appState === 'playing' && isZoomed && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          {currentWeaponSpec.hasScopeOverlay ? (
            <div className="relative flex h-[480px] w-[480px] items-center justify-center rounded-full border-4 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(4,7,13,0.88)]">
              <div className="absolute inset-x-0 h-[1px] bg-emerald-400/75" />
              <div className="absolute inset-y-0 w-[1px] bg-emerald-400/75" />
              <div className="h-3.5 w-3.5 rounded-full border border-rose-500 bg-rose-500/40" />
              <div className="absolute bottom-8 rounded bg-slate-950/90 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-emerald-300 border border-emerald-500/40">
                {currentWeaponSpec.name} • {currentWeaponSpec.zoomFov}° OPTICAL SCOPE • FIRST-PERSON POV
              </div>
            </div>
          ) : (
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-sky-400/80">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <div className="absolute -bottom-7 whitespace-nowrap text-[10px] font-mono text-sky-300 uppercase">
                ADS ZOOM ({currentWeaponSpec.zoomFov}° FOV)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard Crosshair in First-Person POV when not zoomed */}
      {appState === 'playing' && povMode === 'fpp' && !isZoomed && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-x-0 h-[1.5px] bg-amber-400/80" />
            <div className="absolute inset-y-0 w-[1.5px] bg-amber-400/80" />
          </div>
        </div>
      )}

      {/* ====================================================================
          STATE 1: TITLE LAUNCH OVERLAY
         ==================================================================== */}
      {appState === 'title' && (
        <div className="fixed inset-0 z-30 flex items-center justify-between p-8 md:p-14 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent">
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/60 px-3 py-1 text-xs font-mono uppercase tracking-widest text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> 180m × 160m Enterable Campus • Walkable Staircases • Custom Snipers & Shotguns
            </div>

            <div>
              <h1
                className="text-4xl md:text-6xl font-extrabold uppercase tracking-tight text-white leading-none"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                CAMPUS: <span className="text-amber-400">LAST STAND</span>
              </h1>
              <p className="mt-2.5 text-sm md:text-base text-slate-300 leading-relaxed">
                Enter every building (`Block A`, `Block B`, `Block C`, `Cafeteria`, `Basement`), climb walkable staircases up to the 2nd & 3rd floor Skybridges, switch to First-Person Sniper Scope POV, and survive the <span className="text-emerald-400 font-semibold">70% Low</span> / <span className="text-amber-400 font-semibold">20% Mid</span> / <span className="text-rose-400 font-semibold">10% Hard</span> Creepy Zombie outbreak.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Select Gameplay Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'single', label: 'Single Player', desc: '10 Waves + Bosses' },
                    { id: 'coop', label: 'Co-Op Squad (1-4P)', desc: 'Allied AI Defenders' },
                    { id: 'endless', label: 'Endless Survival', desc: 'Infinite Scaling' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setGameMode(m.id)}
                    className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                      gameMode === m.id
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">{m.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Select Threat Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: 'easy', label: 'Easy Recon', desc: '0.8x Zombie HP' },
                    { id: 'normal', label: 'Normal Outbreak', desc: '1.0x Standard' },
                    { id: 'hard', label: 'Nightmare Siege', desc: '1.3x Hardcore' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      difficulty === d.id
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">{d.label}</div>
                    <div className="text-[11px] text-slate-400">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                data-start="true"
                onClick={() => startGameSession()}
                className="flex items-center gap-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-7 py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" /> Deploy to Campus
              </button>

              <button
                onClick={downloadDeployableWebsiteFile}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-3.5 text-xs font-mono uppercase font-bold text-emerald-300 transition cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download Deployable Website (.HTML)
              </button>

              <button
                onClick={() => setAiModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-4 py-3.5 text-xs font-mono uppercase font-bold text-amber-300 transition cursor-pointer"
              >
                <Brain className="h-4 w-4" /> Gemini AI
              </button>
            </div>

            {/* Controls Quick Legend */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/90 p-3.5 text-xs font-mono text-slate-300 grid grid-cols-2 gap-2">
              <div><span className="text-amber-400">WASD / Up-Down:</span> Move & Climb Stairs</div>
              <div><span className="text-amber-400">Left / Right Arrows:</span> Rotate View (Fixed)</div>
              <div><span className="text-sky-400">[V] / Right-Click / [Z]:</span> 1st-Person POV & Scope Zoom</div>
              <div><span className="text-emerald-400">[1–9, 0] / [U]:</span> Snipers, Shotguns, Mid & Long Guns</div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STATE 2: ACTIVE PERIMETER GAMEPLAY HUD
         ==================================================================== */}
      {appState === 'playing' && (
        <>
          {/* TOP-LEFT: Campus Node Telemetry, Elevation & Creepy Spawn Rates */}
          <div className="fixed top-4 left-4 z-20 flex flex-col gap-2 max-w-md pointer-events-none">
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-2.5 shadow-lg pointer-events-auto">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                  {currentZoneName}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                  Elev: {playerElevation.toFixed(1)}m {onStairsFlag ? '• STAIRCASE' : playerElevation >= 8 ? '• 3RD FLOOR / SKYBRIDGE' : playerElevation >= 4 ? '• 2ND FLOOR' : playerElevation < -1 ? '• BASEMENT' : '• GROUND'}
                </span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">{currentZoneDisplay}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono">
                <span className="text-slate-400">Creepy Spawns:</span>
                <span className="text-emerald-400">Low 70% ({creepySpawnCounts.low})</span>
                <span className="text-amber-400">Mid 20% ({creepySpawnCounts.mid})</span>
                <span className="text-rose-400">Hard 10% ({creepySpawnCounts.hard})</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-slate-950/90 px-3.5 py-2 text-xs font-mono text-amber-200 shadow-md">
              <span className="font-bold text-amber-400">RADIO: </span>
              {radioCallout}
            </div>
          </div>

          {/* TOP-CENTER: Boss Health Bar OR Last Targeted Creepy Zombie Info */}
          {activeBossBanner ? (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg rounded-xl border-2 border-rose-500/70 bg-slate-950/95 px-5 py-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                    <Skull className="h-4 w-4" /> {activeBossBanner.subtitle}
                  </div>
                  <div className="text-lg font-extrabold tracking-wide text-white">
                    {activeBossBanner.name}
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-rose-300">
                  {activeBossBanner.hp} / {activeBossBanner.maxHp} HP
                </div>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-150"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (activeBossBanner.hp / activeBossBanner.maxHp) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            lastTargetedZombieInfo && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-2 shadow-lg pointer-events-none">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white">{lastTargetedZombieInfo.name}</span>
                  <span style={{ color: lastTargetedZombieInfo.tierColor }}>
                    {lastTargetedZombieInfo.tierLabel}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (lastTargetedZombieInfo.hp / lastTargetedZombieInfo.maxHp) * 100)
                      )}%`,
                      backgroundColor: lastTargetedZombieInfo.tierColor,
                    }}
                  />
                </div>
              </div>
            )
          )}

          {/* TOP-RIGHT: Wave, POV/Zoom Controls, Minimap & Action Bar */}
          <div className="fixed top-4 right-4 z-20 flex items-start gap-3">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-2.5 shadow-lg">
                <div className="text-right pr-3 border-r border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">WAVE</div>
                  <div className="text-lg font-extrabold font-mono text-amber-400">{wave}</div>
                </div>
                <div className="text-right pr-3 border-r border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">HOSTILES</div>
                  <div className="text-lg font-extrabold font-mono text-rose-400">
                    {zombiesRemaining}
                  </div>
                </div>
                <div className="text-right pr-3 border-r border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">SCRAP</div>
                  <div className="text-lg font-extrabold font-mono text-emerald-400">{scrap}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-slate-400">SCORE</div>
                  <div className="text-lg font-extrabold font-mono text-white">{score}</div>
                </div>
              </div>

              {/* Action Buttons including POV Toggle, Scope Zoom, Left/Right Turn, and Website Download */}
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                  data-toggle-pov="true"
                  onClick={() => setPovMode((m) => (m === 'tpp' ? 'fpp' : 'tpp'))}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono font-bold transition cursor-pointer ${
                    povMode === 'fpp'
                      ? 'border-sky-400 bg-sky-500 text-slate-950'
                      : 'border-sky-500/40 bg-slate-950/90 text-sky-300 hover:bg-slate-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {povMode === 'fpp' ? '1ST PERSON POV [V]' : '3RD PERSON POV [V]'}
                </button>

                <button
                  data-toggle-zoom="true"
                  onClick={() => setIsZoomed((z) => !z)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono font-bold transition cursor-pointer ${
                    isZoomed
                      ? 'border-pink-400 bg-pink-500 text-slate-950'
                      : 'border-pink-500/40 bg-slate-950/90 text-pink-300 hover:bg-slate-900'
                  }`}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  {isZoomed ? 'ZOOM ON [Z]' : 'ZOOM SCOPE [Z]'}
                </button>

                <button
                  data-open-armory="true"
                  onClick={() => setArmoryModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-slate-950/90 px-2.5 py-1.5 text-xs font-mono font-semibold text-amber-300 hover:bg-slate-900 cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" /> Armory [U]
                </button>

                <button
                  data-open-ai="true"
                  onClick={() => setAiModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-slate-950/90 px-2.5 py-1.5 text-xs font-mono font-semibold text-purple-300 hover:bg-slate-900 cursor-pointer"
                >
                  <Brain className="h-3.5 w-3.5" /> AI [T]
                </button>

                <button
                  data-summon-boss="true"
                  onClick={() => spawnBoss('final_boss_wave10')}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-slate-950/90 px-2.5 py-1.5 text-xs font-mono font-semibold text-rose-300 hover:bg-slate-900 cursor-pointer"
                >
                  <Skull className="h-3.5 w-3.5" /> Boss [B]
                </button>

                <button
                  onClick={downloadDeployableWebsiteFile}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-950/90 px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-900 cursor-pointer"
                  title="Download single-file deployable website HTML"
                >
                  <Download className="h-3.5 w-3.5" /> Export .HTML
                </button>

                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    soundEngine.setEnabled(next);
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950/90 p-1.5 text-slate-300 hover:bg-slate-900 cursor-pointer"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => {
                    setAppState('paused');
                    appStateRef.current = 'paused';
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950/90 p-1.5 text-slate-300 hover:bg-slate-900 cursor-pointer"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
            </div>

            <CampusMinimap
              playerX={playerCoords.x}
              playerZ={playerCoords.z}
              playerRotY={playerCoords.yaw}
              entities={minimapEntities}
              expanded={minimapExpanded}
              onToggleExpand={() => setMinimapExpanded((v) => !v)}
            />
          </div>

          {/* BOTTOM-LEFT: Health, Armor, Stamina & Quick Inventory */}
          <div className="fixed bottom-4 left-4 z-20 w-80 rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Heart className="h-3.5 w-3.5" /> HEALTH
                </span>
                <span className="text-white font-bold">
                  {hp} / {maxHp}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(hp / maxHp) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="flex items-center gap-1 text-indigo-400 font-bold">
                  <Shield className="h-3.5 w-3.5" /> ARMOR VEST
                </span>
                <span className="text-white font-bold">
                  {armor} / {maxArmor}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${(armor / maxArmor) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="flex items-center gap-1 text-amber-400">
                  <Zap className="h-3 w-3" /> STAMINA & TURN VIEW
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      cameraYawRef.current += 0.35;
                    }}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-slate-700 cursor-pointer"
                  >
                    ← Turn Left
                  </button>
                  <button
                    onClick={() => {
                      cameraYawRef.current -= 0.35;
                    }}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Turn Right →
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-slate-800/80">
              {(['medkit_small', 'armor_vest', 'speed_booster', 'damage_enhancer'] as PickupType[]).map(
                (pType) => (
                  <button
                    key={pType}
                    onClick={() => handleUseInventoryItem(pType)}
                    disabled={(inventory[pType] || 0) <= 0}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 py-1.5 text-center disabled:opacity-35 cursor-pointer"
                  >
                    <div className="text-[9px] font-mono uppercase text-slate-400">
                      {pType.split('_')[0]}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      ×{inventory[pType] || 0}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* BOTTOM-RIGHT: Active Custom Weapon & Category Hotbar */}
          <div className="fixed bottom-4 right-4 z-20 rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl min-w-[340px] max-w-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" /> {currentWeaponSpec.category} • LVL{' '}
                  {currentWeaponStats.level}/5
                </div>
                <div className="text-base font-extrabold text-white">
                  {currentWeaponSpec.name}
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-extrabold font-mono text-amber-400">
                  {isReloading ? 'RECHRG' : `${ammoInMag} / ${currentWeaponStats.capacity}`}
                </div>
                <button
                  onClick={triggerReload}
                  className="text-[10px] font-mono uppercase text-sky-400 hover:underline cursor-pointer"
                >
                  [R] Reload • [Z] Scope Zoom
                </button>
              </div>
            </div>

            {/* 10 Custom Weapons Switcher Bar (Snipers, Shotguns, Mid-Range, Long-Range) */}
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {(Object.keys(WEAPON_SPECS) as WeaponId[]).map((wId, idx) => {
                const spec = WEAPON_SPECS[wId];
                const isEquipped = equippedWeapon === wId;
                return (
                  <button
                    key={wId}
                    onClick={() => {
                      setUnlockedWeapons((prev) => (prev.includes(wId) ? prev : [...prev, wId]));
                      setEquippedWeapon(wId);
                      const st = computeWeaponStats(wId, weaponLevels[wId] || 1);
                      setAmmoInMag(st.capacity);
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-left transition cursor-pointer ${
                      isEquipped
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-amber-400 font-bold">[{(idx + 1) % 10}]</span>
                      <span className="text-slate-400">{spec.category.split('-')[0]}</span>
                    </div>
                    <div className="truncate text-[10px] font-bold mt-0.5">
                      {spec.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          STATE 3: PAUSED OVERLAY
         ==================================================================== */}
      {appState === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center space-y-4">
            <h2 className="text-2xl font-extrabold uppercase text-white">Tactical Pause</h2>
            <p className="text-xs font-mono text-slate-400">
              Wave {wave} • {currentZoneName} • Elev {playerElevation.toFixed(1)}m
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setAppState('playing');
                  appStateRef.current = 'playing';
                }}
                className="w-full rounded-xl bg-amber-500 py-3 text-xs font-mono font-bold uppercase text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                Resume Mission
              </button>
              <button
                onClick={downloadDeployableWebsiteFile}
                className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/20 py-3 text-xs font-mono font-bold uppercase text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
              >
                Download Deployable Website (.HTML)
              </button>
              <button
                onClick={() => startGameSession()}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-xs font-mono font-bold uppercase text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                Restart Wave 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STATE 4: GAME OVER OVERLAY
         ==================================================================== */}
      {appState === 'gameover' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/50 bg-slate-950 p-8 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Skull className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold uppercase text-white">Campus Overrun</h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Survivor downed at {currentZoneName} during Wave {wave}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-900 p-4 border border-slate-800">
              <div>
                <div className="text-[10px] font-mono text-slate-400">FINAL SCORE</div>
                <div className="text-lg font-extrabold font-mono text-amber-400">{score}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400">HOSTILES SLAIN</div>
                <div className="text-lg font-extrabold font-mono text-white">{totalKills}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400">WAVE REACHED</div>
                <div className="text-lg font-extrabold font-mono text-rose-400">{wave}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => startGameSession()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-xs font-mono font-extrabold uppercase text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Redeploy to Campus
              </button>
              <button
                onClick={downloadDeployableWebsiteFile}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-4 py-3.5 text-xs font-mono font-bold uppercase text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Export Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ArmoryInventoryModal
        isOpen={armoryModalOpen}
        onClose={() => setArmoryModalOpen(false)}
        scrap={scrap}
        unlockedWeapons={unlockedWeapons}
        weaponLevels={weaponLevels}
        equippedWeapon={equippedWeapon}
        inventory={inventory}
        suitColor={suitColor}
        visorColor={visorColor}
        coopBotsCount={coopBotsCount}
        totalKills={totalKills}
        bossesDefeated={bossesDefeated}
        highestWave={highestWave}
        onSelectWeapon={(wId) => {
          setEquippedWeapon(wId);
          const st = computeWeaponStats(wId, weaponLevels[wId] || 1);
          setAmmoInMag(st.capacity);
        }}
        onUnlockOrUpgradeWeapon={handleUnlockOrUpgradeWeapon}
        onUseInventoryItem={handleUseInventoryItem}
        onChangeSuit={(s, v) => {
          setSuitColor(s);
          setVisorColor(v);
        }}
        onChangeCoopBots={(c) => {
          setCoopBotsCount(c);
          syncAlliedBots(c);
        }}
      />

      <TacticalAIModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        gameStateSummary={{
          wave,
          hp,
          armor,
          scrap,
          equippedWeapon: currentWeaponSpec.name,
          currentZone: currentZoneName,
          difficulty,
        }}
      />
    </main>
  );
}
