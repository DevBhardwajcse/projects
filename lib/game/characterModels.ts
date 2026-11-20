import * as THREE from 'three';
import {
  BossId,
  BOSS_SPECS,
  CreepyZombieTier,
  CREEPY_ZOMBIE_TIERS,
  WeaponCategory,
  ZombieClass,
  ZOMBIE_CLASS_SPECS,
} from './rules';

export interface ArticulatedRig {
  root: THREE.Group;
  head: THREE.Object3D;
  torso: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  tail?: THREE.Object3D;
  halo?: THREE.Object3D;
  muzzlePoint?: THREE.Object3D;
  weaponGroup?: THREE.Group;
  creepyTier?: CreepyZombieTier;
}

/**
 * Builds a custom 3D Weapon Mesh matching the weapon category (Sniper, Shotgun, Mid-Range, Long-Range)
 */
export function buildCustomWeaponMesh(category: WeaponCategory, colorHex: string): {
  weaponGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
} {
  const weaponGroup = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
  const matAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.6,
  });
  const matLens = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.1,
  });

  const muzzlePoint = new THREE.Object3D();

  if (category === 'Sniper') {
    // Long precision rifle receiver + extended fluted barrel + dual-lens telescopic scope + bipod
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.65), matBody);
    receiver.position.set(0, 0, -0.2);
    weaponGroup.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.85, 10), matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.82);
    weaponGroup.add(barrel);

    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 12), matAccent);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.03, -1.28);
    weaponGroup.add(suppressor);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.36, 12), matBody);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.13, -0.25);
    weaponGroup.add(scopeTube);

    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 12), matLens);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.13, -0.43);
    weaponGroup.add(scopeLens);

    muzzlePoint.position.set(0, 0.03, -1.42);
  } else if (category === 'Shotgun') {
    // Wide heavy breacher receiver + dual over-under tubes + pump guard / drum mag
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.56), matBody);
    receiver.position.set(0, 0, -0.22);
    weaponGroup.add(receiver);

    const barrelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.62, 10), matBody);
    barrelTop.rotation.x = Math.PI / 2;
    barrelTop.position.set(0, 0.04, -0.62);
    weaponGroup.add(barrelTop);

    const pumpTube = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.42, 10), matAccent);
    pumpTube.rotation.x = Math.PI / 2;
    pumpTube.position.set(0, -0.03, -0.55);
    weaponGroup.add(pumpTube);

    muzzlePoint.position.set(0, 0.04, -0.95);
  } else if (category === 'Long-Range') {
    // Heavy LMG / Marksman Battle Rifle with box mag + long rail + glowing energy core
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.72), matBody);
    receiver.position.set(0, 0, -0.28);
    weaponGroup.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.68, 10), matBody);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.78);
    weaponGroup.add(barrel);

    const coreStrip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.55), matAccent);
    coreStrip.position.set(0, 0.06, -0.45);
    weaponGroup.add(coreStrip);

    const holoSight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.12), matLens);
    holoSight.position.set(0, 0.12, -0.24);
    weaponGroup.add(holoSight);

    muzzlePoint.position.set(0, 0.03, -1.14);
  } else {
    // Mid-Range Tactical Carbine / SMG
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.58), matBody);
    receiver.position.set(0, 0, -0.25);
    weaponGroup.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.45, 10), matAccent);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.62);
    weaponGroup.add(barrel);

    const reflex = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.1), matLens);
    reflex.position.set(0, 0.11, -0.22);
    weaponGroup.add(reflex);

    muzzlePoint.position.set(0, 0.03, -0.88);
  }

  weaponGroup.add(muzzlePoint);
  return { weaponGroup, muzzlePoint };
}

/**
 * Creates the Humanoid Survivor Rig with dynamic custom weapon model.
 */
export function createSurvivorRig(
  suitColorHex = '#2563eb',
  visorColorHex = '#38bdf8',
  weaponCategory: WeaponCategory = 'Mid-Range',
  weaponColorHex = '#38bdf8'
): ArticulatedRig {
  const root = new THREE.Group();
  root.name = 'Humanoid_Survivor_Rig';

  const matSuit = new THREE.MeshStandardMaterial({
    color: new THREE.Color(suitColorHex),
    roughness: 0.45,
    metalness: 0.35,
  });
  const matArmor = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.65,
  });
  const matSkin = new THREE.MeshStandardMaterial({
    color: 0xd6b49c,
    roughness: 0.65,
  });
  const matVisor = new THREE.MeshStandardMaterial({
    color: new THREE.Color(visorColorHex),
    emissive: new THREE.Color(visorColorHex),
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.8,
  });

  const torso = new THREE.Group();
  torso.position.set(0, 1.15, 0);
  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.68, 0.32), matSuit);
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.36), matArmor);
  vestMesh.position.set(0, 0.06, 0);
  torso.add(vestMesh);
  root.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.54, 0);
  const headSphere = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), matSkin);
  headSphere.castShadow = true;
  head.add(headSphere);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.22), matVisor);
  visor.position.set(0, 0.03, -0.08);
  head.add(visor);
  torso.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.38, 0.22, 0);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), matSuit);
  lArmMesh.position.set(0, -0.24, 0);
  leftArm.add(lArmMesh);
  torso.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.38, 0.22, 0);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), matSuit);
  rArmMesh.position.set(0, -0.24, 0);
  rightArm.add(rArmMesh);

  const { weaponGroup, muzzlePoint } = buildCustomWeaponMesh(weaponCategory, weaponColorHex);
  weaponGroup.position.set(0, -0.42, -0.15);
  rightArm.add(weaponGroup);
  rightArm.rotation.x = Math.PI / 2.2;
  torso.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.78, 0);
  const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.78, 0.22), matArmor);
  lLegMesh.position.set(0, -0.39, 0);
  leftLeg.add(lLegMesh);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.78, 0);
  const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.78, 0.22), matArmor);
  rLegMesh.position.set(0, -0.39, 0);
  rightLeg.add(rLegMesh);
  root.add(rightLeg);

  return {
    root,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    muzzlePoint,
    weaponGroup,
  };
}

/**
 * Creates a Zombie 3D Rig based on `NPC_Zombie_And_Titan_Characters_Root.001`
 * enhanced with Creepy Zombie Tier mutations (Low 70% / Mid 20% / Hard 10%).
 */
export function createZombieRig(
  zombieClass: ZombieClass,
  creepyTier: CreepyZombieTier = 'low'
): ArticulatedRig {
  const spec = ZOMBIE_CLASS_SPECS[zombieClass];
  const tierSpec = CREEPY_ZOMBIE_TIERS[creepyTier];
  return buildCreatureRigFromArchetype(
    spec.rigArchetype,
    spec.colorHex,
    tierSpec.colorHex,
    spec.scale * (creepyTier === 'hard' ? 1.18 : creepyTier === 'mid' ? 1.06 : 0.96),
    creepyTier,
    tierSpec.eyeGlowHex
  );
}

/**
 * Creates a Boss Titan 3D Rig based on `NPC_Zombie_And_Titan_Characters_Root.001`
 */
export function createBossRig(bossId: BossId): ArticulatedRig {
  const spec = BOSS_SPECS[bossId];
  return buildCreatureRigFromArchetype(
    spec.rigArchetype,
    spec.colorHex,
    spec.accentHex,
    spec.scale,
    'hard',
    '#ff0055'
  );
}

function buildCreatureRigFromArchetype(
  archetype: 'walker' | 'spiked_raider' | 'halo_screamer' | 'skull_drake' | 'ape_colossus',
  baseHex: string,
  accentHex: string,
  scale: number,
  creepyTier: CreepyZombieTier = 'low',
  eyeGlowHex = '#ef4444'
): ArticulatedRig {
  const root = new THREE.Group();

  const matFlesh = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseHex),
    roughness: 0.65,
    metalness: 0.18,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: creepyTier === 'hard' ? 1.15 : creepyTier === 'mid' ? 0.85 : 0.55,
    roughness: 0.3,
    metalness: 0.4,
  });
  const matEye = new THREE.MeshStandardMaterial({
    color: new THREE.Color(eyeGlowHex),
    emissive: new THREE.Color(eyeGlowHex),
    emissiveIntensity: creepyTier === 'hard' ? 2.0 : 1.3,
  });

  const torso = new THREE.Group();
  const head = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  let tail: THREE.Object3D | undefined;
  let halo: THREE.Object3D | undefined;

  if (archetype === 'ape_colossus') {
    torso.position.set(0, 1.35, 0);
    const upperBack = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), matFlesh);
    upperBack.scale.set(1.25, 0.95, 0.95);
    upperBack.position.set(0, 0.28, 0);
    upperBack.castShadow = true;
    torso.add(upperBack);

    for (let r = 0; r < 3; r++) {
      for (const side of [-0.14, 0.14]) {
        const ab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), matAccent);
        ab.position.set(side, 0.05 - r * 0.14, -0.52);
        torso.add(ab);
      }
    }

    head.position.set(0, 0.32, -0.52);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), matFlesh);
    head.add(skull);
    for (const ex of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), matEye);
      eye.position.set(ex, 0.03, -0.19);
      head.add(eye);
    }
    torso.add(head);

    leftArm.position.set(-0.82, 0.35, 0);
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.15, 10), matFlesh);
    lForearm.position.set(0, -0.55, 0);
    leftArm.add(lForearm);
    torso.add(leftArm);

    rightArm.position.set(0.82, 0.35, 0);
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.15, 10), matFlesh);
    rForearm.position.set(0, -0.55, 0);
    rightArm.add(rForearm);
    torso.add(rightArm);

    leftLeg.position.set(-0.38, 0.95, 0);
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.44), matFlesh);
    lThigh.position.set(0, -0.47, 0);
    leftLeg.add(lThigh);

    rightLeg.position.set(0.38, 0.95, 0);
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.44), matFlesh);
    rThigh.position.set(0, -0.47, 0);
    rightLeg.add(rThigh);
  } else if (archetype === 'skull_drake') {
    torso.position.set(0, 1.28, 0);
    const ribTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.92, 12), matFlesh);
    ribTorso.castShadow = true;
    torso.add(ribTorso);

    for (let i = 0; i < 4; i++) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.32), matAccent);
      gill.position.set(0, 0.22 - i * 0.14, -0.15);
      torso.add(gill);
    }

    head.position.set(0, 0.62, -0.08);
    const skull = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 1), matFlesh);
    head.add(skull);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 8), matAccent);
      horn.position.set(side * 0.24, -0.05, 0);
      horn.rotation.z = side * 1.1;
      head.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), matEye);
      eye.position.set(side * 0.1, 0.03, -0.22);
      head.add(eye);
    }
    torso.add(head);

    leftArm.position.set(-0.52, 0.34, 0);
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.95, 9), matFlesh);
    lArm.position.set(0, -0.45, 0);
    leftArm.add(lArm);
    torso.add(leftArm);

    rightArm.position.set(0.52, 0.34, 0);
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.95, 9), matFlesh);
    rArm.position.set(0, -0.45, 0);
    rightArm.add(rArm);
    torso.add(rightArm);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.35, 0.25);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 8), matFlesh);
    tailMesh.rotation.x = 1.15;
    tailMesh.position.set(0, -0.35, 0.55);
    tailGroup.add(tailMesh);
    torso.add(tailGroup);
    tail = tailGroup;

    leftLeg.position.set(-0.24, 0.85, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), matFlesh);
    lLeg.position.set(0, -0.42, 0);
    leftLeg.add(lLeg);

    rightLeg.position.set(0.24, 0.85, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), matFlesh);
    rLeg.position.set(0, -0.42, 0);
    rightLeg.add(rLeg);
  } else if (archetype === 'halo_screamer') {
    torso.position.set(0, 1.38, 0);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.28), matFlesh);
    chest.castShadow = true;
    torso.add(chest);

    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.31), matAccent);
    torso.add(slit);

    head.position.set(0, 0.55, 0);
    const headOrb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), matFlesh);
    head.add(headOrb);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 24), matAccent);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 0.24, 0);
    head.add(haloRing);
    halo = haloRing;
    torso.add(head);

    leftArm.position.set(-0.38, 0.32, 0);
    const lCannon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.18, 10), matFlesh);
    lCannon.position.set(0, -0.55, 0);
    leftArm.add(lCannon);
    torso.add(leftArm);

    rightArm.position.set(0.38, 0.32, 0);
    const rCannon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.18, 10), matFlesh);
    rCannon.position.set(0, -0.55, 0);
    rightArm.add(rCannon);
    torso.add(rightArm);

    leftLeg.position.set(-0.16, 0.96, 0);
    const lStilt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.96, 0.22), matFlesh);
    lStilt.position.set(0, -0.48, 0);
    leftLeg.add(lStilt);

    rightLeg.position.set(0.16, 0.96, 0);
    const rStilt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.96, 0.22), matFlesh);
    rStilt.position.set(0, -0.48, 0);
    rightLeg.add(rStilt);
  } else {
    // Creepy Walker & Spiked Raider with glowing hollow eyes and creepy dorsal spines for Mid/Hard tiers
    torso.position.set(0, 1.1, 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.26), matFlesh);
    body.castShadow = true;
    torso.add(body);

    const tendril = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.29), matAccent);
    torso.add(tendril);

    if (archetype === 'spiked_raider' || creepyTier !== 'low') {
      const spikeCount = creepyTier === 'hard' ? 5 : 3;
      for (let s = 0; s < spikeCount; s++) {
        const quill = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.55, 6), matAccent);
        quill.position.set(-0.12 + s * 0.06, 0.35, 0.16);
        quill.rotation.x = -0.45;
        torso.add(quill);
      }
    }

    head.position.set(0, 0.48, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), matFlesh);
    head.add(skull);
    for (const ex of [-0.065, 0.065]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), matEye);
      eye.position.set(ex, 0.02, -0.16);
      head.add(eye);
    }
    torso.add(head);

    leftArm.position.set(-0.34, 0.24, 0);
    const lLimb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.68, 0.15), matFlesh);
    lLimb.position.set(0, -0.3, 0);
    leftArm.add(lLimb);
    leftArm.rotation.x = 1.25;
    torso.add(leftArm);

    rightArm.position.set(0.34, 0.24, 0);
    const rLimb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.68, 0.15), matFlesh);
    rLimb.position.set(0, -0.3, 0);
    rightArm.add(rLimb);
    rightArm.rotation.x = 1.25;
    torso.add(rightArm);

    leftLeg.position.set(-0.14, 0.78, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.18), matFlesh);
    lLeg.position.set(0, -0.39, 0);
    leftLeg.add(lLeg);

    rightLeg.position.set(0.14, 0.78, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.18), matFlesh);
    rLeg.position.set(0, -0.39, 0);
    rightLeg.add(rLeg);
  }

  root.add(torso);
  root.add(leftLeg);
  root.add(rightLeg);
  root.scale.setScalar(scale);

  return {
    root,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tail,
    halo,
    creepyTier,
  };
}

/**
 * Procedural animation cycle with creepy twitching head/torso motion for undead.
 */
export function animateCharacterRig(
  rig: ArticulatedRig,
  timeSec: number,
  speedRatio: number,
  isZombie: boolean
) {
  const clampedSpeed = Math.min(1.6, Math.max(0, speedRatio));
  const freq = isZombie ? 7.5 : 9.0;
  const swing = Math.sin(timeSec * freq) * 0.65 * clampedSpeed;

  rig.leftLeg.rotation.x = swing;
  rig.rightLeg.rotation.x = -swing;

  if (isZombie) {
    rig.leftArm.rotation.x = 1.15 + Math.sin(timeSec * freq + 0.5) * 0.28 * clampedSpeed;
    rig.rightArm.rotation.x = 1.15 - Math.sin(timeSec * freq + 0.5) * 0.28 * clampedSpeed;
    rig.torso.rotation.z = Math.cos(timeSec * (freq * 0.5)) * 0.09 * clampedSpeed;
    // Creepy unsettling head tilt & twitch
    const twitch = rig.creepyTier === 'hard' ? 0.35 : rig.creepyTier === 'mid' ? 0.24 : 0.15;
    rig.head.rotation.z = Math.sin(timeSec * 13.0) * twitch;
    rig.head.rotation.y = Math.cos(timeSec * 9.0) * (twitch * 0.8);
  } else {
    rig.leftArm.rotation.x = -swing * 0.7;
    rig.torso.position.y = 1.15 + Math.abs(Math.sin(timeSec * freq)) * 0.04 * clampedSpeed;
  }

  if (rig.tail) {
    rig.tail.rotation.y = Math.sin(timeSec * 5.0) * 0.35;
  }
  if (rig.halo) {
    rig.halo.rotation.z = timeSec * 2.2;
  }
}
