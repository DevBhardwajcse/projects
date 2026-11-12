export type GameMode = 'single' | 'coop' | 'endless';
export type DifficultyLevel = 'easy' | 'normal' | 'hard';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ZombieClass =
  | 'walker'
  | 'runner'
  | 'armored'
  | 'screamer'
  | 'brute'
  | 'stalker'
  | 'elite_mutant';

export type BossTier = 1 | 2 | 3;

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  maxActiveEnemies: number;
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  lootDropChance: number;
  prepTimeSeconds: number;
  bossHealthMultiplier: number;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    maxActiveEnemies: 9,
    enemySpeedMultiplier: 0.8,
    enemyHealthMultiplier: 0.75,
    enemyDamageMultiplier: 0.7,
    lootDropChance: 0.75,
    prepTimeSeconds: 18,
    bossHealthMultiplier: 0.75,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    maxActiveEnemies: 14,
    enemySpeedMultiplier: 1.0,
    enemyHealthMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    lootDropChance: 0.55,
    prepTimeSeconds: 12,
    bossHealthMultiplier: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    maxActiveEnemies: 20,
    enemySpeedMultiplier: 1.22,
    enemyHealthMultiplier: 1.35,
    enemyDamageMultiplier: 1.3,
    lootDropChance: 0.4,
    prepTimeSeconds: 8,
    bossHealthMultiplier: 1.4,
  },
};

export interface EquipmentSpec {
  id: string;
  name: string;
  category: string;
  roleClue: string;
  rarity: ItemRarity;
  baseDamage: number;
  baseRange: number;
  fireRate: number; // shots per second
  energyCapacity: number;
  rechargeTime: number; // seconds
  projectileSpeed: number;
  projectileColor: number;
  spreadAngle: number;
  projectilesPerShot: number;
  elementalEffect: 'kinetic_pulse' | 'cryo_slow' | 'arc_chain' | 'plasma_splash' | 'sonic_push';
  unlockCost: number;
}

export const FICTIONAL_EQUIPMENT_ARSENAL: EquipmentSpec[] = [
  {
    id: 'pulse_carbine',
    name: 'Vanguard Pulse Emitter',
    category: 'Mid-Range Pulse Device',
    roleClue: 'Balanced Rapid Pulse · Starter Issue',
    rarity: 'common',
    baseDamage: 28,
    baseRange: 55,
    fireRate: 6.5,
    energyCapacity: 32,
    rechargeTime: 1.4,
    projectileSpeed: 68,
    projectileColor: 0x38bdf8,
    spreadAngle: 0.03,
    projectilesPerShot: 1,
    elementalEffect: 'kinetic_pulse',
    unlockCost: 0,
  },
  {
    id: 'scatter_prism',
    name: 'Aegis Wide-Area Scatter',
    category: 'Close-Range Energy Emitter',
    roleClue: '5-Beam Spread · Crowd Control',
    rarity: 'uncommon',
    baseDamage: 22,
    baseRange: 28,
    fireRate: 2.2,
    energyCapacity: 12,
    rechargeTime: 1.8,
    projectileSpeed: 56,
    projectileColor: 0xf59e0b,
    spreadAngle: 0.16,
    projectilesPerShot: 5,
    elementalEffect: 'sonic_push',
    unlockCost: 150,
  },
  {
    id: 'scar_hyper_projector',
    name: 'SCAR-X Hyper Projector',
    category: 'Rapid Energy Projector',
    roleClue: 'High-Velocity Thermal Stream',
    rarity: 'rare',
    baseDamage: 42,
    baseRange: 70,
    fireRate: 8.0,
    energyCapacity: 40,
    rechargeTime: 1.3,
    projectileSpeed: 82,
    projectileColor: 0xfacc15,
    spreadAngle: 0.02,
    projectilesPerShot: 1,
    elementalEffect: 'kinetic_pulse',
    unlockCost: 320,
  },
  {
    id: 'cryo_lance',
    name: 'Zero-K Freeze Emitter',
    category: 'Freeze Emitter',
    roleClue: 'Sub-Zero Beam · Slows Targets 50%',
    rarity: 'rare',
    baseDamage: 36,
    baseRange: 48,
    fireRate: 5.0,
    energyCapacity: 28,
    rechargeTime: 1.5,
    projectileSpeed: 64,
    projectileColor: 0x22d3ee,
    spreadAngle: 0.025,
    projectilesPerShot: 1,
    elementalEffect: 'cryo_slow',
    unlockCost: 400,
  },
  {
    id: 'voltaic_arc',
    name: 'Tesla-9 Electric Arc',
    category: 'Electric Arc Device',
    roleClue: 'Chain Lightning · Arcs Near Hostiles',
    rarity: 'epic',
    baseDamage: 54,
    baseRange: 52,
    fireRate: 3.8,
    energyCapacity: 24,
    rechargeTime: 1.6,
    projectileSpeed: 76,
    projectileColor: 0xa855f7,
    spreadAngle: 0.04,
    projectilesPerShot: 2,
    elementalEffect: 'arc_chain',
    unlockCost: 600,
  },
  {
    id: 'titan_omega_launcher',
    name: 'Helios Heavy Energy Launcher',
    category: 'Heavy Fictional Energy Launcher',
    roleClue: 'Explosive Plasma Core · Anti-Titan',
    rarity: 'legendary',
    baseDamage: 145,
    baseRange: 85,
    fireRate: 1.35,
    energyCapacity: 10,
    rechargeTime: 2.1,
    projectileSpeed: 52,
    projectileColor: 0xef4444,
    spreadAngle: 0.01,
    projectilesPerShot: 1,
    elementalEffect: 'plasma_splash',
    unlockCost: 900,
  },
];

export const UPGRADE_LEVEL_NAMES: Record<number, string> = {
  1: 'Standard',
  2: 'Improved',
  3: 'Advanced',
  4: 'Epic',
  5: 'Legendary',
};

export interface UpgradedWeaponStats {
  level: number;
  levelName: string;
  damage: number;
  energyCapacity: number;
  rechargeTime: number;
  nextUpgradeCost: number | null;
}

export function computeWeaponStats(spec: EquipmentSpec, level: number): UpgradedWeaponStats {
  const clampedLevel = Math.max(1, Math.min(5, Math.floor(level)));
  const mult = 1 + (clampedLevel - 1) * 0.28;
  const capBonus = Math.round(spec.energyCapacity * (1 + (clampedLevel - 1) * 0.2));
  const recharge = Number(
    Math.max(0.55, spec.rechargeTime * Math.pow(0.88, clampedLevel - 1)).toFixed(2)
  );
  const nextUpgradeCost = clampedLevel < 5 ? Math.round((spec.unlockCost + 180) * clampedLevel * 0.85) : null;

  return {
    level: clampedLevel,
    levelName: UPGRADE_LEVEL_NAMES[clampedLevel] || 'Standard',
    damage: Math.round(spec.baseDamage * mult),
    energyCapacity: capBonus,
    rechargeTime: recharge,
    nextUpgradeCost,
  };
}

export interface ZombieClassSpec {
  id: ZombieClass;
  name: string;
  baseHealth: number;
  baseSpeed: number;
  detectionRange: number;
  attackRange: number;
  baseDamage: number;
  attackWindup: number; // telegraph in seconds
  attackCooldown: number;
  xpReward: number;
  scrapReward: number;
  scale: number;
  behaviorPolicy: 'chaser' | 'charger' | 'shielded' | 'screamer_kiter' | 'flanker' | 'heavy_crusher';
}

export const ZOMBIE_CLASS_SPECS: Record<ZombieClass, ZombieClassSpec> = {
  walker: {
    id: 'walker',
    name: 'Infected Walker',
    baseHealth: 80,
    baseSpeed: 3.2,
    detectionRange: 34,
    attackRange: 2.1,
    baseDamage: 10,
    attackWindup: 0.45,
    attackCooldown: 1.3,
    xpReward: 35,
    scrapReward: 18,
    scale: 1.0,
    behaviorPolicy: 'chaser',
  },
  runner: {
    id: 'runner',
    name: 'Spiked Runner',
    baseHealth: 65,
    baseSpeed: 6.4,
    detectionRange: 42,
    attackRange: 2.2,
    baseDamage: 12,
    attackWindup: 0.3,
    attackCooldown: 1.0,
    xpReward: 50,
    scrapReward: 25,
    scale: 1.02,
    behaviorPolicy: 'charger',
  },
  armored: {
    id: 'armored',
    name: 'Riot Armored Infected',
    baseHealth: 190,
    baseSpeed: 2.7,
    detectionRange: 32,
    attackRange: 2.3,
    baseDamage: 16,
    attackWindup: 0.55,
    attackCooldown: 1.5,
    xpReward: 75,
    scrapReward: 40,
    scale: 1.12,
    behaviorPolicy: 'shielded',
  },
  screamer: {
    id: 'screamer',
    name: 'Halo Screamer Anomaly',
    baseHealth: 110,
    baseSpeed: 4.1,
    detectionRange: 50,
    attackRange: 14.0,
    baseDamage: 14,
    attackWindup: 0.65,
    attackCooldown: 2.4,
    xpReward: 85,
    scrapReward: 45,
    scale: 1.28,
    behaviorPolicy: 'screamer_kiter',
  },
  stalker: {
    id: 'stalker',
    name: 'Shadow Stalker',
    baseHealth: 125,
    baseSpeed: 5.6,
    detectionRange: 45,
    attackRange: 2.4,
    baseDamage: 18,
    attackWindup: 0.35,
    attackCooldown: 1.1,
    xpReward: 90,
    scrapReward: 50,
    scale: 1.08,
    behaviorPolicy: 'flanker',
  },
  brute: {
    id: 'brute',
    name: 'Campus Brute',
    baseHealth: 340,
    baseSpeed: 2.9,
    detectionRange: 38,
    attackRange: 3.0,
    baseDamage: 26,
    attackWindup: 0.7,
    attackCooldown: 1.9,
    xpReward: 140,
    scrapReward: 75,
    scale: 1.55,
    behaviorPolicy: 'heavy_crusher',
  },
  elite_mutant: {
    id: 'elite_mutant',
    name: 'Apex Crimson Mutant',
    baseHealth: 480,
    baseSpeed: 4.6,
    detectionRange: 52,
    attackRange: 3.2,
    baseDamage: 32,
    attackWindup: 0.6,
    attackCooldown: 1.6,
    xpReward: 220,
    scrapReward: 120,
    scale: 1.7,
    behaviorPolicy: 'heavy_crusher',
  },
};

export interface BossSpec {
  tier: BossTier;
  id: string;
  name: string;
  subtitle: string;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  scale: number;
  xpReward: number;
  scrapReward: number;
  guaranteedRarity: ItemRarity;
}

export const BOSS_SPECS: Record<BossTier, BossSpec> = {
  1: {
    tier: 1,
    id: 'stalker_prime',
    name: 'HALO OVERLORD',
    subtitle: 'MINI-BOSS · WAVE 5 ANOMALY',
    baseHealth: 1200,
    baseSpeed: 4.2,
    baseDamage: 28,
    scale: 2.3,
    xpReward: 600,
    scrapReward: 350,
    guaranteedRarity: 'rare',
  },
  2: {
    tier: 2,
    id: 'skull_drake_titan',
    name: 'SKULL-DRAKE TITAN',
    subtitle: 'ELITE TITAN · BIO-REPTILIAN BEHEMOTH',
    baseHealth: 2400,
    baseSpeed: 4.5,
    baseDamage: 36,
    scale: 3.2,
    xpReward: 1200,
    scrapReward: 650,
    guaranteedRarity: 'epic',
  },
  3: {
    tier: 3,
    id: 'ape_colossus_titan',
    name: 'THE CAMPUS DESTROYER',
    subtitle: 'FINAL TITAN BOSS · MAGMA APE COLOSSUS',
    baseHealth: 4200,
    baseSpeed: 4.8,
    baseDamage: 45,
    scale: 4.5,
    xpReward: 2500,
    scrapReward: 1500,
    guaranteedRarity: 'legendary',
  },
};

export interface WaveDefinition {
  waveNumber: number;
  title: string;
  totalEnemies: number;
  composition: ZombieClass[];
  bossTier: BossTier | null;
}

export function getWaveDefinition(waveNumber: number, difficulty: DifficultyLevel): WaveDefinition {
  const w = Math.max(1, Math.floor(waveNumber));
  const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
  const baseCount = Math.max(5, Math.round((6 + w * 3) * diffMult));

  let composition: ZombieClass[] = ['walker'];
  let title = 'Outbreak Perimeter Breach';
  let bossTier: BossTier | null = null;

  if (w === 1) {
    composition = ['walker', 'walker', 'runner'];
    title = 'Wave 1 · Initial Quadrangle Breach';
  } else if (w === 2) {
    composition = ['walker', 'runner', 'runner'];
    title = 'Wave 2 · Sprint Swarmers';
  } else if (w === 3) {
    composition = ['walker', 'runner', 'armored', 'screamer'];
    title = 'Wave 3 · Riot & Screamer Alert';
  } else if (w === 4) {
    composition = ['runner', 'armored', 'screamer', 'stalker'];
    title = 'Wave 4 · Academic Wing Lockdown';
  } else if (w === 5) {
    composition = ['walker', 'runner', 'armored', 'brute'];
    title = 'Wave 5 · Mini-Boss: Halo Overlord';
    bossTier = 1;
  } else if (w === 6) {
    composition = ['runner', 'armored', 'stalker', 'brute'];
    title = 'Wave 6 · Undercroft Siege';
  } else if (w === 7) {
    composition = ['screamer', 'stalker', 'brute', 'armored'];
    title = 'Wave 7 · Nightfall Stalkers';
  } else if (w === 8) {
    composition = ['runner', 'stalker', 'brute', 'elite_mutant'];
    title = 'Wave 8 · Elite Boss: Skull-Drake Titan';
    bossTier = 2;
  } else if (w === 9) {
    composition = ['armored', 'brute', 'stalker', 'elite_mutant'];
    title = 'Wave 9 · Apex Mutant Surge';
  } else if (w === 10) {
    composition = ['runner', 'brute', 'elite_mutant'];
    title = 'Wave 10 · Final Boss: The Campus Destroyer';
    bossTier = 3;
  } else {
    composition = ['runner', 'armored', 'screamer', 'stalker', 'brute', 'elite_mutant'];
    title = `Wave ${w} · Endless Cataclysm`;
    if (w % 5 === 0) {
      bossTier = 3;
    } else if (w % 3 === 0) {
      bossTier = 2;
    }
  }

  return {
    waveNumber: w,
    title,
    totalEnemies: baseCount,
    composition,
    bossTier,
  };
}

export interface DynamicDirectorInput {
  playerHpRatio: number; // 0 to 1
  recentKillRatePerMin: number;
  downedCount: number;
  baseDifficulty: DifficultyLevel;
}

export interface DynamicDirectorOutput {
  pressureMultiplier: number; // 0.75 to 1.35
  lootBonusChance: number; // 0 to 0.25
  spawnEliteOverride: boolean;
  statusLabel: string;
}

export function evaluateDynamicDifficulty(input: DynamicDirectorInput): DynamicDirectorOutput {
  let pressure = 1.0;
  let lootBonus = 0.0;
  let spawnElite = false;
  let label = 'Balanced Pace';

  if (input.playerHpRatio > 0.8 && input.recentKillRatePerMin >= 12 && input.downedCount === 0) {
    pressure = 1.2;
    spawnElite = true;
    label = 'Escalating Threat (+20%)';
  } else if (input.playerHpRatio < 0.35 || input.downedCount >= 2) {
    pressure = 0.8;
    lootBonus = 0.22;
    label = 'Mercy Relief (-20% Threat, +Loot)';
  } else if (input.playerHpRatio > 0.65 && input.recentKillRatePerMin >= 8) {
    pressure = 1.1;
    label = 'High Tempo (+10%)';
  }

  // Respect base difficulty bounds
  const clampedPressure = Number(Math.max(0.75, Math.min(1.35, pressure)).toFixed(2));
  return {
    pressureMultiplier: clampedPressure,
    lootBonusChance: lootBonus,
    spawnEliteOverride: spawnElite,
    statusLabel: label,
  };
}

export interface DamageResult {
  newHp: number;
  newArmor: number;
  hpDamageTaken: number;
  armorAbsorbed: number;
  isDowned: boolean;
}

export function applyDamageWithArmor(
  currentHp: number,
  currentArmor: number,
  rawDamage: number,
  armorTierProtection: number = 0.65
): DamageResult {
  const dmg = Math.max(0, rawDamage);
  const clampedProtection = Math.max(0.2, Math.min(0.85, armorTierProtection));

  let armorAbsorbed = 0;
  let newArmor = currentArmor;
  if (currentArmor > 0) {
    const desiredAbsorb = Math.round(dmg * clampedProtection);
    armorAbsorbed = Math.min(currentArmor, desiredAbsorb);
    newArmor = Math.max(0, currentArmor - armorAbsorbed);
  }

  const hpDamageTaken = Math.max(1, Math.round(dmg - armorAbsorbed));
  const newHp = Math.max(0, currentHp - hpDamageTaken);

  return {
    newHp,
    newArmor,
    hpDamageTaken,
    armorAbsorbed,
    isDowned: newHp <= 0,
  };
}

export type PickupType =
  | 'health_small'
  | 'health_medium'
  | 'medkit_large'
  | 'health_emergency'
  | 'health_full'
  | 'armor_basic'
  | 'armor_medium'
  | 'armor_advanced'
  | 'armor_epic'
  | 'armor_restore'
  | 'energy_pack'
  | 'boost_speed'
  | 'boost_shield'
  | 'boost_double_scrap'
  | 'scrap_cache'
  | 'supply_crate';

export interface PickupSpec {
  type: PickupType;
  name: string;
  rarity: ItemRarity;
  healAmount: number;
  armorAmount: number;
  scrapAmount: number;
  energyRefill: boolean;
  storeInMedkitSlot: boolean;
  buffType?: 'speed' | 'shield' | 'double_scrap';
  buffDuration?: number;
  colorHex: number;
}

export const PICKUP_CATALOG: Record<PickupType, PickupSpec> = {
  health_small: {
    type: 'health_small',
    name: 'Small Health Pack (+25 HP)',
    rarity: 'common',
    healAmount: 25,
    armorAmount: 0,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0x22c55e,
  },
  health_medium: {
    type: 'health_medium',
    name: 'Medium Health Pack (+50 HP)',
    rarity: 'uncommon',
    healAmount: 50,
    armorAmount: 0,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0x10b981,
  },
  medkit_large: {
    type: 'medkit_large',
    name: 'Large Field Medkit (Portable +75 HP)',
    rarity: 'rare',
    healAmount: 75,
    armorAmount: 0,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: true,
    colorHex: 0x34d399,
  },
  health_emergency: {
    type: 'health_emergency',
    name: 'Emergency Adrenaline Kit (+90 HP & Speed)',
    rarity: 'epic',
    healAmount: 90,
    armorAmount: 0,
    scrapAmount: 0,
    energyRefill: true,
    storeInMedkitSlot: false,
    buffType: 'speed',
    buffDuration: 12,
    colorHex: 0xa855f7,
  },
  health_full: {
    type: 'health_full',
    name: 'Full Bio-Restoration Supply (100% HP)',
    rarity: 'legendary',
    healAmount: 100,
    armorAmount: 25,
    scrapAmount: 0,
    energyRefill: true,
    storeInMedkitSlot: false,
    colorHex: 0xf59e0b,
  },
  armor_basic: {
    type: 'armor_basic',
    name: 'Basic Kevlar Plate (+25 Armor)',
    rarity: 'common',
    healAmount: 0,
    armorAmount: 25,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0x38bdf8,
  },
  armor_medium: {
    type: 'armor_medium',
    name: 'Medium Tactical Vest (+50 Armor)',
    rarity: 'uncommon',
    healAmount: 0,
    armorAmount: 50,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0x0ea5e9,
  },
  armor_advanced: {
    type: 'armor_advanced',
    name: 'Advanced Composite Armor (+75 Armor)',
    rarity: 'rare',
    healAmount: 0,
    armorAmount: 75,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0x3b82f6,
  },
  armor_epic: {
    type: 'armor_epic',
    name: 'Epic Exo-Plating (Full 100 Armor)',
    rarity: 'epic',
    healAmount: 0,
    armorAmount: 100,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0xa855f7,
  },
  armor_restore: {
    type: 'armor_restore',
    name: 'Nano-Armor Repair Cell (+40 Armor)',
    rarity: 'uncommon',
    healAmount: 0,
    armorAmount: 40,
    scrapAmount: 0,
    energyRefill: true,
    storeInMedkitSlot: false,
    colorHex: 0x60a5fa,
  },
  energy_pack: {
    type: 'energy_pack',
    name: 'Plasma Energy Cell (Full Charge + Scrap)',
    rarity: 'common',
    healAmount: 0,
    armorAmount: 0,
    scrapAmount: 30,
    energyRefill: true,
    storeInMedkitSlot: false,
    colorHex: 0x22d3ee,
  },
  boost_speed: {
    type: 'boost_speed',
    name: 'OverdriveInjector (+35% Move Speed)',
    rarity: 'rare',
    healAmount: 15,
    armorAmount: 0,
    scrapAmount: 0,
    energyRefill: true,
    storeInMedkitSlot: false,
    buffType: 'speed',
    buffDuration: 15,
    colorHex: 0xfacc15,
  },
  boost_shield: {
    type: 'boost_shield',
    name: 'Aegis Kinetic Barrier (+Shield Boost)',
    rarity: 'epic',
    healAmount: 0,
    armorAmount: 50,
    scrapAmount: 0,
    energyRefill: false,
    storeInMedkitSlot: false,
    buffType: 'shield',
    buffDuration: 15,
    colorHex: 0xc084fc,
  },
  boost_double_scrap: {
    type: 'boost_double_scrap',
    name: 'Bounty Amplifier (2x Scrap & XP)',
    rarity: 'rare',
    healAmount: 0,
    armorAmount: 0,
    scrapAmount: 60,
    energyRefill: false,
    storeInMedkitSlot: false,
    buffType: 'double_scrap',
    buffDuration: 20,
    colorHex: 0xfbbf24,
  },
  scrap_cache: {
    type: 'scrap_cache',
    name: 'Campus Tech Scrap Cache (+85 Scrap)',
    rarity: 'uncommon',
    healAmount: 0,
    armorAmount: 0,
    scrapAmount: 85,
    energyRefill: false,
    storeInMedkitSlot: false,
    colorHex: 0xf59e0b,
  },
  supply_crate: {
    type: 'supply_crate',
    name: 'Mystery Military Supply Crate',
    rarity: 'legendary',
    healAmount: 50,
    armorAmount: 50,
    scrapAmount: 150,
    energyRefill: true,
    storeInMedkitSlot: true,
    colorHex: 0xf97316,
  },
};

export interface CampusLandmarkZone {
  id: string;
  name: string;
  code: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Exact coordinate bounds from Campus 3D Visual Atlas Page 1 & Page 2
 * North = -Z, South = +Z, East = +X, West = -X
 */
export const CAMPUS_ATLAS_ZONES: CampusLandmarkZone[] = [
  {
    id: '02_Academic_Block_B_Central',
    name: 'Academic Block B (Central & TT Undercroft)',
    code: 'BLK-B',
    minX: -14,
    maxX: 14,
    minZ: -43,
    maxZ: -21,
  },
  {
    id: '03_Academic_Block_A_West',
    name: 'Academic Block A (West Lecture Wing)',
    code: 'BLK-A',
    minX: -44,
    maxX: -20,
    minZ: -23,
    maxZ: -1,
  },
  {
    id: '04_Academic_Block_C_East',
    name: 'Academic Block C (East Academic Wing)',
    code: 'BLK-C',
    minX: 14,
    maxX: 38,
    minZ: -24,
    maxZ: -4,
  },
  {
    id: '05_Basement_Garage_And_Sports',
    name: 'Basement Parking Ramp & Indoor Sports Hall',
    code: 'BSMT',
    minX: 15,
    maxX: 41,
    minZ: -51,
    maxZ: -24,
  },
  {
    id: '06_Cafeteria_FoodCourt_Kiosk',
    name: 'Cafeteria, Food Court & Blue Chai Kiosk',
    code: 'CAFE',
    minX: 11,
    maxX: 40,
    minZ: 10,
    maxZ: 37,
  },
  {
    id: '07_Sports_Amphitheater_Tower',
    name: 'Cricket Ground, Stone Amphitheater & Water Tower',
    code: 'SPORT',
    minX: -78,
    maxX: -20,
    minZ: -56,
    maxZ: 56,
  },
  {
    id: '08_Quadrangle_Badminton',
    name: 'Central Flagpole Quadrangle & Badminton Court',
    code: 'QUAD',
    minX: -19,
    maxX: 20,
    minZ: -20,
    maxZ: 18,
  },
  {
    id: '01_Main_Gate_Avenue',
    name: 'Main Wrought-Iron Gatehouse & South Avenue',
    code: 'GATE',
    minX: -18,
    maxX: 18,
    minZ: 18,
    maxZ: 74,
  },
];

export function getCampusZoneName(x: number, z: number): string {
  for (const zone of CAMPUS_ATLAS_ZONES) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return zone.name;
    }
  }
  return 'Campus Perimeter Avenue';
}

export interface AABBBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

/**
 * Resolves circle-vs-AABB collision in the XZ plane so neither player nor zombies/NPCs
 * ever walk through solid building walls or obstacles while still allowing entry through
 * open building portals, undercrofts, and corridors.
 */
export function resolveXZCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AABBBox[],
  worldBounds = { minX: -86, maxX: 86, minZ: -76, maxZ: 70 }
): { x: number; z: number; collided: boolean } {
  let outX = Math.max(worldBounds.minX, Math.min(worldBounds.maxX, x));
  let outZ = Math.max(worldBounds.minZ, Math.min(worldBounds.maxZ, z));
  let collided = false;

  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i];
    const closestX = Math.max(box.minX, Math.min(outX, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(outZ, box.maxZ));
    const dx = outX - closestX;
    const dz = outZ - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      collided = true;
      if (distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        outX += (dx / dist) * overlap;
        outZ += (dz / dist) * overlap;
      } else {
        // Inside box: push out via nearest edge
        const leftPen = Math.abs(outX - box.minX);
        const rightPen = Math.abs(box.maxX - outX);
        const topPen = Math.abs(outZ - box.minZ);
        const bottomPen = Math.abs(box.maxZ - outZ);
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === leftPen) outX = box.minX - radius;
        else if (minPen === rightPen) outX = box.maxX + radius;
        else if (minPen === topPen) outZ = box.minZ - radius;
        else outZ = box.maxZ + radius;
      }
    }
  }

  return { x: outX, z: outZ, collided };
}
