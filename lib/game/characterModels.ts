import * as THREE from 'three';
import { BossTier, ZombieClass } from './rules';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  weaponMesh?: THREE.Group;
  tailPivot?: THREE.Group;
  haloMesh?: THREE.Mesh;
  telegraphRing?: THREE.Mesh;
  primaryMaterials: THREE.MeshStandardMaterial[];
  walkPhase: number;
}

function addContactShadow(root: THREE.Group, radius: number = 0.75) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  root.add(shadow);
}

/**
 * Builds the Playable Survivor & Co-op Squad NPC model based on the 6th humanoid rig
 * in Screenshot_2026-11-12_093429_827c53eb.png + tactical backpack, vest & energy rifle
 * from the campus gameplay videos.
 */
export function createSurvivorRig(
  suitColorHex: number = 0x1e293b,
  vestColorHex: number = 0x334155,
  weaponColorHex: number = 0x38bdf8
): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  addContactShadow(root, 0.72);

  const primaryMaterials: THREE.MeshStandardMaterial[] = [];

  const suitMat = new THREE.MeshStandardMaterial({
    color: suitColorHex,
    roughness: 0.75,
    metalness: 0.15,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestColorHex,
    roughness: 0.5,
    metalness: 0.35,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd6a582,
    roughness: 0.65,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.85,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.6,
    metalness: 0.25,
  });
  primaryMaterials.push(suitMat, vestMat, skinMat);

  // Pelvis & Torso
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.3), vestMat);
  pelvis.position.y = 0.92;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.64, 0.32), suitMat);
  torso.position.y = 1.34;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Tactical Plate Carrier Vest + Pouches
  const plateVest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.36), vestMat);
  plateVest.position.y = 1.34;
  plateVest.castShadow = true;
  bodyGroup.add(plateVest);

  // Tactical Backpack (prominent in third-person camera view in both gameplay videos)
  const backpack = new THREE.Group();
  backpack.position.set(0, 1.34, 0.25);
  const packMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.52, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7, metalness: 0.2 })
  );
  packMain.castShadow = true;
  backpack.add(packMain);

  const packPouch = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 })
  );
  packPouch.position.set(0, -0.08, 0.14);
  backpack.add(packPouch);

  const statusBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 0.04),
    new THREE.MeshStandardMaterial({
      color: weaponColorHex,
      emissive: weaponColorHex,
      emissiveIntensity: 1.5,
    })
  );
  statusBeacon.position.set(0.11, 0.18, 0.12);
  backpack.add(statusBeacon);
  bodyGroup.add(backpack);

  // Head & Hair
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.72, 0);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const hairCrop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
  hairCrop.position.set(0, 0.28, 0.01);
  headGroup.add(hairCrop);
  bodyGroup.add(headGroup);

  // Articulated Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.37, 1.58, 0);
  const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.16), suitMat);
  leftUpperArm.position.y = -0.24;
  leftUpperArm.castShadow = true;
  leftArmPivot.add(leftUpperArm);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.37, 1.58, 0);
  const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.16), suitMat);
  rightUpperArm.position.y = -0.24;
  rightUpperArm.castShadow = true;
  rightArmPivot.add(rightUpperArm);

  // Fictional Energy Weapon mounted in Right Hand
  const weaponMesh = new THREE.Group();
  weaponMesh.position.set(0.02, -0.34, -0.35);
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.16, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 })
  );
  weaponMesh.add(receiver);
  const energyCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.06, 0.44),
    new THREE.MeshStandardMaterial({
      color: weaponColorHex,
      emissive: weaponColorHex,
      emissiveIntensity: 1.8,
    })
  );
  energyCore.position.set(0, 0.04, -0.08);
  weaponMesh.add(energyCore);
  rightArmPivot.add(weaponMesh);
  rightArmPivot.rotation.x = 0.65; // Ready aiming pose
  leftArmPivot.rotation.x = 0.5;
  leftArmPivot.rotation.z = 0.25;
  bodyGroup.add(rightArmPivot);

  // Articulated Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.15, 0.84, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.76, 0.22), suitMat);
  leftLeg.position.y = -0.36;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.28), bootMat);
  leftBoot.position.set(0, -0.74, -0.03);
  leftLegPivot.add(leftBoot);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.15, 0.84, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.76, 0.22), suitMat);
  rightLeg.position.y = -0.36;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.28), bootMat);
  rightBoot.position.set(0, -0.74, -0.03);
  rightLegPivot.add(rightBoot);
  bodyGroup.add(rightLegPivot);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    weaponMesh,
    primaryMaterials,
    walkPhase: 0,
  };
}

/**
 * Builds the 7 Zombie / Mutant classes based on the exact silhouettes in
 * Screenshot_2026-11-12_093429_827c53eb.png (Models 3, 4, 5):
 * - Model 3: Lean Infected with vertical crimson chest fissure (walker / stalker)
 * - Model 4: Asymmetrical pauldron + back spikes + forearm shield/blade (runner / armored)
 * - Model 5: Tall Halo Anomaly with floating horned ring above head & long clawed arms (screamer / brute / elite_mutant)
 */
export function createZombieRig(zombieClass: ZombieClass, scaleMult: number = 1.0): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  addContactShadow(root, 0.75 * scaleMult);

  const primaryMaterials: THREE.MeshStandardMaterial[] = [];

  const colorMap: Record<ZombieClass, { skin: number; accent: number; emissive: number }> = {
    walker: { skin: 0x64748b, accent: 0x334155, emissive: 0xdc2626 },
    runner: { skin: 0x78716c, accent: 0x44403c, emissive: 0xf97316 },
    armored: { skin: 0x475569, accent: 0x1e293b, emissive: 0x38bdf8 },
    screamer: { skin: 0x94a3b8, accent: 0x475569, emissive: 0xef4444 },
    stalker: { skin: 0x3f3f46, accent: 0x18181b, emissive: 0xa855f7 },
    brute: { skin: 0x57534e, accent: 0x292524, emissive: 0xea580c },
    elite_mutant: { skin: 0x451a1a, accent: 0x7f1d1d, emissive: 0xff2222 },
  };

  const palette = colorMap[zombieClass];
  const skinMat = new THREE.MeshStandardMaterial({
    color: palette.skin,
    roughness: 0.72,
    metalness: 0.18,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    roughness: 0.45,
    metalness: 0.55,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: palette.emissive,
    emissive: palette.emissive,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  primaryMaterials.push(skinMat, armorMat);

  // Ground telegraph ring (visible when zombie winds up an attack)
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.9, 24),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.03;
  root.add(telegraphRing);

  // Pelvis & Tapered Geometric Torso (matching polygonal Blender meshes in Screenshot)
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.28), armorMat);
  pelvis.position.y = 0.92;
  bodyGroup.add(pelvis);

  const torsoW = zombieClass === 'brute' || zombieClass === 'elite_mutant' ? 0.68 : 0.5;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, 0.66, 0.34), skinMat);
  torso.position.y = 1.36;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Vertical Crimson Chest Fissure (seen on Model 3 & Model 5 in Screenshot)
  const chestFissure = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.36), coreMat);
  chestFissure.position.set(0, 1.38, 0);
  bodyGroup.add(chestFissure);

  // Head & Glowing Eyes
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.78, 0);
  const headGeo = new THREE.OctahedronGeometry(0.22, 1);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), coreMat);
  eyeL.position.set(-0.07, 0.16, -0.19);
  headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), coreMat);
  eyeR.position.set(0.07, 0.16, -0.19);
  headGroup.add(eyeR);

  // Model 4 (Runner / Armored): Asymmetrical Shoulder Pauldron, Diagonal Sash & Back Spikes
  if (zombieClass === 'runner' || zombieClass === 'armored' || zombieClass === 'stalker') {
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.38), armorMat);
    sash.position.set(0, 1.36, 0);
    sash.rotation.z = 0.55;
    bodyGroup.add(sash);

    const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), armorMat);
    pauldronL.position.set(-0.34, 1.62, 0);
    bodyGroup.add(pauldronL);

    // Back-mounted spears/spikes (exact match to 4th model in Screenshot)
    for (let s = 0; s < 2; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.95, 6), armorMat);
      spike.position.set(-0.14 + s * 0.12, 1.75, 0.22);
      spike.rotation.z = -0.15 + s * 0.1;
      bodyGroup.add(spike);
    }
  }

  // Model 5 (Screamer / Elite Mutant): Floating Horned Halo Ring above head + Spherical Shoulder Orbs
  let haloMesh: THREE.Mesh | undefined;
  if (zombieClass === 'screamer' || zombieClass === 'elite_mutant') {
    haloMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.045, 8, 24, Math.PI * 1.45),
      coreMat
    );
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(0, 0.46, 0);
    headGroup.add(haloMesh);

    const orbL = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), skinMat);
    orbL.position.set(-0.38, 1.65, 0);
    bodyGroup.add(orbL);
    const orbR = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), skinMat);
    orbR.position.set(0.38, 1.65, 0);
    bodyGroup.add(orbR);
  }

  bodyGroup.add(headGroup);

  // Articulated Arms & Claws
  const armLen = zombieClass === 'screamer' ? 0.78 : 0.62;
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-torsoW / 2 - 0.1, 1.58, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, armLen, 0.16), skinMat);
  leftArm.position.y = -armLen / 2;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  leftArmPivot.rotation.x = 0.85; // Zombie outstretched reach
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(torsoW / 2 + 0.1, 1.58, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, armLen, 0.16), skinMat);
  rightArm.position.y = -armLen / 2;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  if (zombieClass === 'armored') {
    // Riot forearm shield (Model 4 right arm shield)
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.42), armorMat);
    shield.position.set(0.12, -0.35, -0.1);
    rightArmPivot.add(shield);
  }
  rightArmPivot.rotation.x = 0.85;
  bodyGroup.add(rightArmPivot);

  // Articulated Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.86, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.82, 0.22), skinMat);
  leftLeg.position.y = -0.41;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.86, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.82, 0.22), skinMat);
  rightLeg.position.y = -0.41;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  bodyGroup.add(rightLegPivot);

  root.scale.setScalar(scaleMult);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    haloMesh,
    telegraphRing,
    primaryMaterials,
    walkPhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Builds the 3 Boss Categories matching the 2 massive Titan models on the left of
 * Screenshot_2026-11-12_093429_827c53eb.png and the magma-veined Titan Boss in the videos:
 * - Tier 1 (Mini-Boss): Halo Overlord Anomaly
 * - Tier 2 (Elite Boss - Model 1 far left): Skull-Drake Reptilian Titan with 5-ribbed chest carapace,
 *   side elbow spikes, horned skull head, and long segmented reptilian tail!
 * - Tier 3 (Final Boss - Model 2 second from left): Ape Colossus / The Campus Destroyer with
 *   massive hunched dome back, 6-pack abdominal armor blocks, glowing red eyes & magma chest core,
 *   and colossal ground-slamming fists!
 */
export function createBossRig(tier: BossTier, scaleMult: number = 1.0): CharacterRig {
  if (tier === 1) {
    return createZombieRig('screamer', scaleMult);
  }

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  addContactShadow(root, 1.45 * scaleMult);

  const primaryMaterials: THREE.MeshStandardMaterial[] = [];

  const carapaceMat = new THREE.MeshStandardMaterial({
    color: tier === 3 ? 0x292524 : 0x334155,
    roughness: 0.55,
    metalness: 0.45,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: tier === 3 ? 0x1c1917 : 0x475569,
    roughness: 0.4,
    metalness: 0.65,
  });
  const magmaMat = new THREE.MeshStandardMaterial({
    color: 0xff3b1f,
    emissive: 0xef4444,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  primaryMaterials.push(carapaceMat, plateMat);

  // Boss Attack Telegraph Ring
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.9, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff2200,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.04;
  root.add(telegraphRing);

  let tailPivot: THREE.Group | undefined;

  if (tier === 2) {
    // ========================================================================
    // MODEL 1 (Far-left in Screenshot): SKULL-DRAKE REPTILIAN TITAN
    // ========================================================================
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.54), carapaceMat);
    pelvis.position.y = 1.08;
    bodyGroup.add(pelvis);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.96, 0.58), carapaceMat);
    torso.position.y = 1.68;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 5 Horizontal Ribbed Chest Plates (exact match to Model 1 in Screenshot)
    for (let r = 0; r < 5; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.64), plateMat);
      rib.position.set(0, 1.32 + r * 0.16, 0);
      bodyGroup.add(rib);
    }

    // Glowing Magma Core Seam
    const magmaSeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.65), magmaMat);
    magmaSeam.position.set(0, 1.65, 0);
    bodyGroup.add(magmaSeam);

    // Horned Reptilian Skull Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.25, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), carapaceMat);
    skull.scale.set(1.0, 0.95, 1.25);
    headGroup.add(skull);

    // Side Swept Horns (Model 1 in Screenshot)
    [-1, 1].forEach((dir) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 8), plateMat);
      horn.position.set(dir * 0.28, -0.02, 0.05);
      horn.rotation.z = dir * 1.15;
      headGroup.add(horn);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), magmaMat);
      eye.position.set(dir * 0.11, 0.02, -0.28);
      headGroup.add(eye);
    });
    bodyGroup.add(headGroup);

    // Long Segmented Reptilian Tail curving down between/behind legs (Model 1 in Screenshot)
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, 1.02, 0.25);
    for (let t = 0; t < 5; t++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16 - t * 0.025, 0.13 - t * 0.025, 0.34, 8),
        carapaceMat
      );
      seg.position.set(t * 0.06, -t * 0.2, t * 0.18);
      seg.rotation.x = 0.55;
      seg.rotation.z = -0.25;
      tailPivot.add(seg);
    }
    bodyGroup.add(tailPivot);

    // Heavy Arms with Forearm Spikes
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.62, 1.98, 0);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.92, 0.28), carapaceMat);
    lArm.position.y = -0.42;
    lArm.castShadow = true;
    leftArmPivot.add(lArm);
    const lSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), plateMat);
    lSpike.position.set(-0.2, -0.45, 0);
    lSpike.rotation.z = Math.PI / 2.3;
    leftArmPivot.add(lSpike);
    bodyGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.62, 1.98, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.92, 0.28), carapaceMat);
    rArm.position.y = -0.42;
    rArm.castShadow = true;
    rightArmPivot.add(rArm);
    const rSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), plateMat);
    rSpike.position.set(0.2, -0.45, 0);
    rSpike.rotation.z = -Math.PI / 2.3;
    rightArmPivot.add(rSpike);
    bodyGroup.add(rightArmPivot);

    // Heavy Pillar Legs with 3-Toed Claws
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.26, 1.0, 0);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.98, 0.36), carapaceMat);
    lLeg.position.y = -0.49;
    lLeg.castShadow = true;
    leftLegPivot.add(lLeg);
    bodyGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.26, 1.0, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.98, 0.36), carapaceMat);
    rLeg.position.y = -0.49;
    rLeg.castShadow = true;
    rightLegPivot.add(rLeg);
    bodyGroup.add(rightLegPivot);

    root.scale.setScalar(scaleMult);
    return {
      root,
      bodyGroup,
      headGroup,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      tailPivot,
      telegraphRing,
      primaryMaterials,
      walkPhase: 0,
    };
  }

  // ==========================================================================
  // MODEL 2 (2nd from left in Screenshot + Video Titan): APE COLOSSUS / CAMPUS DESTROYER
  // ==========================================================================
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, 0.78), carapaceMat);
  pelvis.position.y = 1.15;
  bodyGroup.add(pelvis);

  // Massive Hunched Domed Upper Carapace & Pectoral Plates
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.05, 0.88), carapaceMat);
  torso.position.y = 1.78;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const domeHunch = new THREE.Mesh(new THREE.SphereGeometry(0.76, 16, 12), carapaceMat);
  domeHunch.scale.set(1.15, 0.75, 0.95);
  domeHunch.position.set(0, 2.38, 0.06);
  domeHunch.castShadow = true;
  bodyGroup.add(domeHunch);

  // 6-Pack Abdominal Armor Nodes (exact match to Model 2 in Screenshot!)
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col += 2) {
      const abBlock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), plateMat);
      abBlock.position.set(col * 0.16, 1.42 + row * 0.18, -0.44);
      bodyGroup.add(abBlock);
    }
  }

  // Glowing Magma Core & Lava Veins on Chest (matching Video 1 & Video 2 Titan Boss!)
  const magmaChest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), magmaMat);
  magmaChest.scale.set(1.3, 1.0, 0.5);
  magmaChest.position.set(0, 1.92, -0.42);
  bodyGroup.add(magmaChest);

  // Sunken Forward-Set Colossus Head with Glowing Red Eyes & Shoulder Horns
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.18, -0.44);
  const headSkull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), plateMat);
  headSkull.scale.set(0.95, 1.15, 1.0);
  headGroup.add(headSkull);

  [-1, 1].forEach((dir) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), magmaMat);
    eye.position.set(dir * 0.09, 0.04, -0.21);
    headGroup.add(eye);

    const crestHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), magmaMat);
    crestHorn.position.set(dir * 0.45, 0.35, 0.12);
    crestHorn.rotation.z = -dir * 0.55;
    headGroup.add(crestHorn);
  });
  bodyGroup.add(headGroup);

  // Colossal Gorilla-Style Forearms & Fists (Model 2 in Screenshot)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.92, 2.08, 0);
  const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.48), carapaceMat);
  lUpper.position.y = -0.28;
  leftArmPivot.add(lUpper);
  const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.58), plateMat);
  lForearm.position.y = -0.88;
  lForearm.castShadow = true;
  leftArmPivot.add(lForearm);
  const lFist = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), magmaMat);
  lFist.position.y = -1.26;
  leftArmPivot.add(lFist);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.92, 2.08, 0);
  const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.48), carapaceMat);
  rUpper.position.y = -0.28;
  rightArmPivot.add(rUpper);
  const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.58), plateMat);
  rForearm.position.y = -0.88;
  rForearm.castShadow = true;
  rightArmPivot.add(rForearm);
  const rFist = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), magmaMat);
  rFist.position.y = -1.26;
  rightArmPivot.add(rFist);
  bodyGroup.add(rightArmPivot);

  // Massive Segmented Legs & 5-Toed Stomp Feet (Model 2 in Screenshot)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.38, 1.05, 0);
  const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.52), carapaceMat);
  lLeg.position.y = -0.48;
  lLeg.castShadow = true;
  leftLegPivot.add(lLeg);
  const lFoot = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.64), plateMat);
  lFoot.position.set(0, -0.96, -0.06);
  leftLegPivot.add(lFoot);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.38, 1.05, 0);
  const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.52), carapaceMat);
  rLeg.position.y = -0.48;
  rLeg.castShadow = true;
  rightLegPivot.add(rLeg);
  const rFoot = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.64), plateMat);
  rFoot.position.set(0, -0.96, -0.06);
  rightLegPivot.add(rFoot);
  bodyGroup.add(rightLegPivot);

  root.scale.setScalar(scaleMult);
  return {
    root,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    telegraphRing,
    primaryMaterials,
    walkPhase: 0,
  };
}

/**
 * Animates a CharacterRig's limbs, torso bob, windup telegraph, and KO topple
 * synced to distance traveled and combat state.
 */
export function animateCharacterRig(
  rig: CharacterRig,
  speed: number,
  dt: number,
  elapsed: number,
  isSurvivor: boolean,
  isAttackingWindup: boolean = false,
  koProgress: number = 0 // 0 = alive, 0..1 = toppling KO animation
) {
  if (koProgress > 0) {
    rig.bodyGroup.rotation.x = -Math.min(1, koProgress) * (Math.PI / 2.1);
    rig.bodyGroup.position.y = -Math.min(1, koProgress) * 0.45;
    if (rig.telegraphRing) {
      (rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    return;
  }

  rig.bodyGroup.rotation.x = 0;

  if (speed > 0.15) {
    rig.walkPhase += speed * dt * 2.3;
    const swing = Math.sin(rig.walkPhase) * 0.62;
    rig.leftLegPivot.rotation.x = swing;
    rig.rightLegPivot.rotation.x = -swing;
    rig.bodyGroup.position.y = Math.abs(Math.cos(rig.walkPhase)) * 0.06;

    if (isSurvivor) {
      rig.leftArmPivot.rotation.x = 0.45 - swing * 0.18;
      rig.rightArmPivot.rotation.x = 0.68 + Math.sin(rig.walkPhase * 2) * 0.04;
    } else {
      rig.leftArmPivot.rotation.x = 0.8 + swing * 0.35;
      rig.rightArmPivot.rotation.x = 0.8 - swing * 0.35;
    }
  } else {
    // Smooth idle breathing
    rig.leftLegPivot.rotation.x *= 0.85;
    rig.rightLegPivot.rotation.x *= 0.85;
    rig.bodyGroup.position.y = Math.sin(elapsed * 2.5 + rig.walkPhase) * 0.025;

    if (!isSurvivor) {
      rig.leftArmPivot.rotation.x = 0.72 + Math.sin(elapsed * 2.2) * 0.08;
      rig.rightArmPivot.rotation.x = 0.72 + Math.cos(elapsed * 2.2) * 0.08;
    }
  }

  // Windup attack telegraph animation
  if (isAttackingWindup && !isSurvivor) {
    rig.leftArmPivot.rotation.x = 2.15;
    rig.rightArmPivot.rotation.x = 2.15;
    if (rig.telegraphRing) {
      const mat = rig.telegraphRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(elapsed * 18) * 0.25;
    }
  } else if (rig.telegraphRing) {
    const mat = rig.telegraphRing.material as THREE.MeshBasicMaterial;
    mat.opacity = 0;
  }

  if (rig.tailPivot) {
    rig.tailPivot.rotation.y = Math.sin(elapsed * 3.2) * 0.28;
  }
  if (rig.haloMesh) {
    rig.haloMesh.rotation.z = elapsed * 1.8;
  }
}
