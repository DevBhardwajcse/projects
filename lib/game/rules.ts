// Pure game rules, 3D multi-floor staircase/wall physics, weapon catalog, and 70/20/10 creepy zombie spawn logic

export type GameMode = 'single' | 'coop' | 'endless';
export type DifficultyPreset = 'easy' | 'normal' | 'hard';
export type POVMode = 'tpp' | 'fpp';

export type WeaponId =
  | 'sniper_bolt'
  | 'sniper_thermal_dmr'
  | 'sniper_gauss_rail'
  | 'shotgun_pump'
  | 'shotgun_autodrum'
  | 'mid_assault_carbine'
  | 'mid_tactical_smg'
  | 'long_marksman_rifle'
  | 'long_heavy_lmg'
  | 'scar_x_projector';

export type WeaponCategory = 'Sniper' | 'Shotgun' | 'Mid-Range' | 'Long-Range';

export interface WeaponBaseSpec {
  id: WeaponId;
  name: string;
  category: WeaponCategory;
  baseDamage: number;
  fireRateRpm: number;
  baseCapacity: number;
  baseReloadSec: number;
  rangeMeters: number;
  projectileSpeed: number;
  pellets: number;
  spreadRad: number;
  zoomFov: number;
  hasScopeOverlay: boolean;
  unlockCost: number;
  colorHex: string;
  description: string;
}

export interface ComputedWeaponStats {
  level: number;
  damage: number;
  fireIntervalMs: number;
  capacity: number;
  reloadSec: number;
  nextUpgradeCost: number | null;
}

export const WEAPON_SPECS: Record<WeaponId, WeaponBaseSpec> = {
  mid_assault_carbine: {
    id: 'mid_assault_carbine',
    name: 'M4-Vanguard Pulse Carbine',
    category: 'Mid-Range',
    baseDamage: 34,
    fireRateRpm: 540,
    baseCapacity: 32,
    baseReloadSec: 1.7,
    rangeMeters: 95,
    projectileSpeed: 92,
    pellets: 1,
    spreadRad: 0.015,
    zoomFov: 38,
    hasScopeOverlay: false,
    unlockCost: 0,
    colorHex: '#38bdf8',
    description: 'Balanced mid-range automatic carbine with holographic sight and low recoil.',
  },
  mid_tactical_smg: {
    id: 'mid_tactical_smg',
    name: 'Vector-9 Cryo Submachine Gun',
    category: 'Mid-Range',
    baseDamage: 25,
    fireRateRpm: 780,
    baseCapacity: 40,
    baseReloadSec: 1.35,
    rangeMeters: 70,
    projectileSpeed: 84,
    pellets: 1,
    spreadRad: 0.028,
    zoomFov: 42,
    hasScopeOverlay: false,
    unlockCost: 140,
    colorHex: '#22d3ee',
    description: 'Ultra-fast mid-range SMG ideal for indoor corridors, staircases, and tight rooms.',
  },
  shotgun_pump: {
    id: 'shotgun_pump',
    name: 'M870 Kinetic Breacher Shotgun',
    category: 'Shotgun',
    baseDamage: 25,
    fireRateRpm: 95,
    baseCapacity: 8,
    baseReloadSec: 2.1,
    rangeMeters: 42,
    projectileSpeed: 76,
    pellets: 8,
    spreadRad: 0.085,
    zoomFov: 48,
    hasScopeOverlay: false,
    unlockCost: 160,
    colorHex: '#f97316',
    description: 'Heavy 8-pellet pump-action shotgun that shreds creepy zombies in building interiors.',
  },
  shotgun_autodrum: {
    id: 'shotgun_autodrum',
    name: 'AA-12 Hellfire Drum Shotgun',
    category: 'Shotgun',
    baseDamage: 20,
    fireRateRpm: 240,
    baseCapacity: 20,
    baseReloadSec: 2.4,
    rangeMeters: 46,
    projectileSpeed: 78,
    pellets: 7,
    spreadRad: 0.095,
    zoomFov: 46,
    hasScopeOverlay: false,
    unlockCost: 340,
    colorHex: '#fb923c',
    description: 'Full-auto 20-round drum shotgun built for clearing staircases and mid-tier packs.',
  },
  long_marksman_rifle: {
    id: 'long_marksman_rifle',
    name: 'MK14 EBR Long-Range Rifle',
    category: 'Long-Range',
    baseDamage: 72,
    fireRateRpm: 260,
    baseCapacity: 20,
    baseReloadSec: 1.9,
    rangeMeters: 145,
    projectileSpeed: 120,
    pellets: 1,
    spreadRad: 0.006,
    zoomFov: 28,
    hasScopeOverlay: false,
    unlockCost: 220,
    colorHex: '#a3e635',
    description: 'High-velocity long-range battle rifle for quadrangle and skybridge engagements.',
  },
  long_heavy_lmg: {
    id: 'long_heavy_lmg',
    name: 'M249 Titan Suppressor LMG',
    category: 'Long-Range',
    baseDamage: 44,
    fireRateRpm: 600,
    baseCapacity: 85,
    baseReloadSec: 3.0,
    rangeMeters: 130,
    projectileSpeed: 105,
    pellets: 1,
    spreadRad: 0.022,
    zoomFov: 34,
    hasScopeOverlay: false,
    unlockCost: 380,
    colorHex: '#eab308',
    description: 'Sustained long-range 85-round light machine gun with armor-piercing rounds.',
  },
  sniper_bolt: {
    id: 'sniper_bolt',
    name: 'AWM-50 Anti-Materiel Bolt Sniper',
    category: 'Sniper',
    baseDamage: 220,
    fireRateRpm: 55,
    baseCapacity: 6,
    baseReloadSec: 2.3,
    rangeMeters: 220,
    projectileSpeed: 165,
    pellets: 1,
    spreadRad: 0.001,
    zoomFov: 16,
    hasScopeOverlay: true,
    unlockCost: 240,
    colorHex: '#ec4899',
    description: '8x optical bolt-action sniper rifle. Massive one-shot critical damage from rooftops.',
  },
  sniper_thermal_dmr: {
    id: 'sniper_thermal_dmr',
    name: 'SVD-Valkyrie Semi-Auto Sniper',
    category: 'Sniper',
    baseDamage: 130,
    fireRateRpm: 155,
    baseCapacity: 12,
    baseReloadSec: 1.95,
    rangeMeters: 195,
    projectileSpeed: 150,
    pellets: 1,
    spreadRad: 0.0025,
    zoomFov: 20,
    hasScopeOverlay: true,
    unlockCost: 350,
    colorHex: '#a855f7',
    description: 'Rapid semi-automatic marksman sniper with 6x tactical rangefinder optics.',
  },
  sniper_gauss_rail: {
    id: 'sniper_gauss_rail',
    name: 'XR-99 Gauss Railgun Sniper',
    category: 'Sniper',
    baseDamage: 330,
    fireRateRpm: 45,
    baseCapacity: 5,
    baseReloadSec: 2.5,
    rangeMeters: 250,
    projectileSpeed: 195,
    pellets: 1,
    spreadRad: 0.0005,
    zoomFov: 14,
    hasScopeOverlay: true,
    unlockCost: 500,
    colorHex: '#f43f5e',
    description: 'Hyper-velocity electromagnetic sniper rifle built to stagger Hard Creepy Zombies & Titans.',
  },
  scar_x_projector: {
    id: 'scar_x_projector',
    name: 'SCAR-X Hyper Long-Range Projector',
    category: 'Long-Range',
    baseDamage: 95,
    fireRateRpm: 420,
    baseCapacity: 45,
    baseReloadSec: 1.6,
    rangeMeters: 170,
    projectileSpeed: 135,
    pellets: 2,
    spreadRad: 0.012,
    zoomFov: 26,
    hasScopeOverlay: true,
    unlockCost: 620,
    colorHex: '#10b981',
    description: 'Classified military supply crate prototype firing twin long-range plasma lances.',
  },
};

export const WEAPON_UPGRADE_COSTS: Record<number, number> = {
  1: 120,
  2: 240,
  3: 420,
  4: 680,
};

export function computeWeaponStats(weaponId: WeaponId, level: number): ComputedWeaponStats {
  const clampedLevel = Math.max(1, Math.min(5, Math.floor(level)));
  const spec = WEAPON_SPECS[weaponId];
  const lvlBonus = clampedLevel - 1;

  const damage = Math.round(spec.baseDamage * (1 + lvlBonus * 0.22));
  const effectiveRpm = spec.fireRateRpm * (1 + lvlBonus * 0.08);
  const fireIntervalMs = Math.max(55, Math.round(60000 / effectiveRpm));
  const capacity = Math.round(spec.baseCapacity * (1 + lvlBonus * 0.18));
  const reloadSec = Number((spec.baseReloadSec * Math.pow(0.9, lvlBonus)).toFixed(2));
  const nextUpgradeCost = clampedLevel < 5 ? WEAPON_UPGRADE_COSTS[clampedLevel] : null;

  return {
    level: clampedLevel,
    damage,
    fireIntervalMs,
    capacity,
    reloadSec,
    nextUpgradeCost,
  };
}

// ============================================================================
// RANDOM CREEPY ZOMBIES: 70% LOW / 20% MID / 10% HARD SPAWN PROBABILITY SYSTEM
// ============================================================================

export type CreepyZombieTier = 'low' | 'mid' | 'hard';

export interface CreepyZombieTierSpec {
  tier: CreepyZombieTier;
  label: string;
  spawnChance: number;
  difficultyTag: string;
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  scoreBonus: number;
  scrapBonus: number;
  colorHex: string;
  eyeGlowHex: string;
  creepyTrait: string;
}

export const CREEPY_ZOMBIE_TIERS: Record<CreepyZombieTier, CreepyZombieTierSpec> = {
  low: {
    tier: 'low',
    label: 'Creepy Shambler (Low Level)',
    spawnChance: 0.70,
    difficultyTag: 'Easy to Defeat (70%)',
    hpMultiplier: 0.85,
    speedMultiplier: 0.92,
    damageMultiplier: 0.8,
    scoreBonus: 40,
    scrapBonus: 14,
    colorHex: '#4ade80',
    eyeGlowHex: '#86efac',
    creepyTrait: 'Twitching hollow-eyed corpse; fragile torso, easy to eliminate with any weapon.',
  },
  mid: {
    tier: 'mid',
    label: 'Spiked Night-Stalker (Mid Level)',
    spawnChance: 0.20,
    difficultyTag: 'Requires Skill (20%)',
    hpMultiplier: 1.65,
    speedMultiplier: 1.22,
    damageMultiplier: 1.35,
    scoreBonus: 110,
    scrapBonus: 32,
    colorHex: '#f59e0b',
    eyeGlowHex: '#fde047',
    creepyTrait: 'Sprinting side-weaving stalker with bone spines; requires aim tracking & kiting skill.',
  },
  hard: {
    tier: 'hard',
    label: 'Abyssal Terror Fiend (Hard Level)',
    spawnChance: 0.10,
    difficultyTag: 'High Skill & Very Difficult (10%)',
    hpMultiplier: 3.1,
    speedMultiplier: 1.38,
    damageMultiplier: 1.95,
    scoreBonus: 260,
    scrapBonus: 75,
    colorHex: '#ef4444',
    eyeGlowHex: '#ff0055',
    creepyTrait: 'Armored blood-mist horror with violent lunge & regeneration; demands sniper/shotgun mastery.',
  },
};

/**
 * Rolls a Creepy Zombie Tier using the exact user-specified distribution:
 * - Low level (easy to defeat): 70% (0.00 <= r < 0.70)
 * - Mid level (required skills): 20% (0.70 <= r < 0.90)
 * - Hard level (very much skills & difficult): 10% (0.90 <= r < 1.00)
 */
export function rollCreepyZombieTier(rng: () => number = Math.random): CreepyZombieTier {
  const r = Math.max(0, Math.min(0.999999, rng()));
  if (r < 0.70) return 'low';
  if (r < 0.90) return 'mid';
  return 'hard';
}

export type ZombieClass =
  | 'walker'
  | 'runner'
  | 'armored'
  | 'screamer'
  | 'brute'
  | 'stalker'
  | 'elite_mutant';

export interface ZombieClassSpec {
  id: ZombieClass;
  name: string;
  rigArchetype: 'walker' | 'spiked_raider' | 'halo_screamer' | 'skull_drake' | 'ape_colossus';
  baseHp: number;
  baseSpeed: number;
  attackDamage: number;
  attackRange: number;
  scoreReward: number;
  scrapReward: number;
  scale: number;
  colorHex: string;
  accentHex: string;
  behaviorDesc: string;
}

export const ZOMBIE_CLASS_SPECS: Record<ZombieClass, ZombieClassSpec> = {
  walker: {
    id: 'walker',
    name: 'Infected Walker',
    rigArchetype: 'walker',
    baseHp: 80,
    baseSpeed: 3.4,
    attackDamage: 10,
    attackRange: 1.9,
    scoreReward: 50,
    scrapReward: 12,
    scale: 1.0,
    colorHex: '#64748b',
    accentHex: '#ef4444',
    behaviorDesc: 'Relentless corpse shambler with crimson chest tendril.',
  },
  runner: {
    id: 'runner',
    name: 'Spiked Sprint Raider',
    rigArchetype: 'spiked_raider',
    baseHp: 68,
    baseSpeed: 6.2,
    attackDamage: 12,
    attackRange: 1.8,
    scoreReward: 70,
    scrapReward: 16,
    scale: 0.98,
    colorHex: '#78716c',
    accentHex: '#f97316',
    behaviorDesc: 'Fast-sprinting raider with dorsal quills that climbs stairs rapidly.',
  },
  armored: {
    id: 'armored',
    name: 'Riot-Shielded Infected',
    rigArchetype: 'spiked_raider',
    baseHp: 175,
    baseSpeed: 3.1,
    attackDamage: 16,
    attackRange: 2.0,
    scoreReward: 110,
    scrapReward: 26,
    scale: 1.12,
    colorHex: '#475569',
    accentHex: '#38bdf8',
    behaviorDesc: 'Heavy torso plating and forearm shield reduce non-sniper damage.',
  },
  screamer: {
    id: 'screamer',
    name: 'Halo Screamer Anomaly',
    rigArchetype: 'halo_screamer',
    baseHp: 120,
    baseSpeed: 4.3,
    attackDamage: 15,
    attackRange: 3.2,
    scoreReward: 130,
    scrapReward: 30,
    scale: 1.25,
    colorHex: '#6b7280',
    accentHex: '#e879f9',
    behaviorDesc: 'Towering anomaly with floating horn-halo that buffs nearby undead.',
  },
  brute: {
    id: 'brute',
    name: 'Crusher Brute',
    rigArchetype: 'ape_colossus',
    baseHp: 290,
    baseSpeed: 2.8,
    attackDamage: 24,
    attackRange: 2.5,
    scoreReward: 170,
    scrapReward: 42,
    scale: 1.42,
    colorHex: '#57534e',
    accentHex: '#f59e0b',
    behaviorDesc: 'Massive muscular juggernaut with ground-slam shockwaves.',
  },
  stalker: {
    id: 'stalker',
    name: 'Night Stalker',
    rigArchetype: 'walker',
    baseHp: 115,
    baseSpeed: 6.6,
    attackDamage: 18,
    attackRange: 2.0,
    scoreReward: 140,
    scrapReward: 34,
    scale: 1.04,
    colorHex: '#1e293b',
    accentHex: '#a855f7',
    behaviorDesc: 'Flanking shadow predator that ambushes inside buildings and stairwells.',
  },
  elite_mutant: {
    id: 'elite_mutant',
    name: 'Bio-Drake Mutant',
    rigArchetype: 'skull_drake',
    baseHp: 380,
    baseSpeed: 4.4,
    attackDamage: 28,
    attackRange: 2.8,
    scoreReward: 240,
    scrapReward: 58,
    scale: 1.55,
    colorHex: '#3f3f46',
    accentHex: '#10b981',
    behaviorDesc: 'Scaled reptilian bio-weapon with spiked tail and acid leap.',
  },
};

export function pickZombieClassForTier(tier: CreepyZombieTier, wave: number, rng: () => number = Math.random): ZombieClass {
  const r = rng();
  if (tier === 'low') {
    return r < 0.72 ? 'walker' : 'runner';
  }
  if (tier === 'mid') {
    if (r < 0.35) return 'runner';
    if (r < 0.70) return 'stalker';
    return 'armored';
  }
  if (wave >= 3 && r < 0.35) return 'elite_mutant';
  if (r < 0.70) return 'brute';
  return 'screamer';
}

export type BossId = 'mini_boss_wave5' | 'elite_boss_wave8' | 'final_boss_wave10';

export interface BossSpec {
  id: BossId;
  name: string;
  subtitle: string;
  rigArchetype: 'halo_screamer' | 'skull_drake' | 'ape_colossus';
  waveTrigger: number;
  baseHp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  scale: number;
  scoreReward: number;
  scrapReward: number;
  colorHex: string;
  accentHex: string;
  specialAbilities: string[];
}

export const BOSS_SPECS: Record<BossId, BossSpec> = {
  mini_boss_wave5: {
    id: 'mini_boss_wave5',
    name: 'THE HALO OVERLORD',
    subtitle: 'Wave 5 Anomaly Mini-Boss • Crowned Bio-Screamer',
    rigArchetype: 'halo_screamer',
    waveTrigger: 5,
    baseHp: 1600,
    speed: 3.9,
    attackDamage: 30,
    attackRange: 3.8,
    scale: 2.4,
    scoreReward: 1000,
    scrapReward: 250,
    colorHex: '#52525b',
    accentHex: '#d946ef',
    specialAbilities: ['Sonic Pulse Ring', 'Summon Runner Pack'],
  },
  elite_boss_wave8: {
    id: 'elite_boss_wave8',
    name: 'SKULL-DRAKE TITAN',
    subtitle: 'Wave 8 Elite Boss • Armored Reptilian Bio-Titan',
    rigArchetype: 'skull_drake',
    waveTrigger: 8,
    baseHp: 3200,
    speed: 4.3,
    attackDamage: 40,
    attackRange: 4.5,
    scale: 2.9,
    scoreReward: 2200,
    scrapReward: 450,
    colorHex: '#3f3f46',
    accentHex: '#22c55e',
    specialAbilities: ['Spiked Tail Sweep', 'Acidic Bio-Barrage', 'Frenzy Charge'],
  },
  final_boss_wave10: {
    id: 'final_boss_wave10',
    name: 'THE CAMPUS DESTROYER',
    subtitle: 'Wave 10 Final Boss • 6-Pack Magma Ape Colossus',
    rigArchetype: 'ape_colossus',
    waveTrigger: 10,
    baseHp: 5600,
    speed: 3.7,
    attackDamage: 52,
    attackRange: 5.2,
    scale: 3.4,
    scoreReward: 5000,
    scrapReward: 1000,
    colorHex: '#292524',
    accentHex: '#ef4444',
    specialAbilities: ['Seismic Quadrangle Slam', 'Meteor Boulder Throw', 'Undead Enrage Aura'],
  },
};

export interface WaveDefinition {
  waveNumber: number;
  totalZombies: number;
  maxConcurrent: number;
  spawnIntervalMs: number;
  hpMultiplier: number;
  speedMultiplier: number;
  allowedClasses: ZombieClass[];
  bossToSpawn: BossId | null;
  creepyTierProbabilities: { low: number; mid: number; hard: number };
}

export function getWaveDefinition(
  waveNumber: number,
  difficulty: DifficultyPreset,
  mode: GameMode,
  playerCount = 1
): WaveDefinition {
  const w = Math.max(1, Math.floor(waveNumber));
  const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
  const coopMult = mode === 'coop' ? 1 + (Math.max(1, playerCount) - 1) * 0.35 : 1.0;

  const totalZombies = Math.round((9 + w * 4) * diffMult * coopMult);
  const maxConcurrent = Math.min(30, Math.round((7 + w * 2) * coopMult));
  const spawnIntervalMs = Math.max(550, Math.round(2000 - w * 110));
  const hpMultiplier = Number(((1 + (w - 1) * 0.14) * diffMult * coopMult).toFixed(2));
  const speedMultiplier = Number(Math.min(1.5, (1 + (w - 1) * 0.03) * (difficulty === 'hard' ? 1.08 : 1)).toFixed(2));

  const allowedClasses: ZombieClass[] = ['walker', 'runner', 'stalker', 'armored', 'screamer', 'brute', 'elite_mutant'];

  let bossToSpawn: BossId | null = null;
  if (w === 5) bossToSpawn = 'mini_boss_wave5';
  else if (w === 8) bossToSpawn = 'elite_boss_wave8';
  else if (w === 10 || (w > 10 && w % 5 === 0)) bossToSpawn = 'final_boss_wave10';

  return {
    waveNumber: w,
    totalZombies,
    maxConcurrent,
    spawnIntervalMs,
    hpMultiplier,
    speedMultiplier,
    allowedClasses,
    bossToSpawn,
    creepyTierProbabilities: { low: 0.70, mid: 0.20, hard: 0.10 },
  };
}

export interface DynamicDirectorInput {
  playerHpRatio: number;
  recentKillsPerMin: number;
  playerAccuracyRatio: number;
  timesDowned: number;
}

export interface DynamicDirectorAdjustment {
  aggressionMultiplier: number;
  lootDropBonus: number;
  directorStateLabel: 'Mercy Assist' | 'Balanced Flow' | 'Apex Escalation';
}

export function evaluateDynamicDifficulty(input: DynamicDirectorInput): DynamicDirectorAdjustment {
  if (input.playerHpRatio < 0.3 || input.timesDowned >= 2) {
    return {
      aggressionMultiplier: 0.82,
      lootDropBonus: 0.35,
      directorStateLabel: 'Mercy Assist',
    };
  }
  if (input.playerHpRatio > 0.75 && input.recentKillsPerMin >= 18 && input.playerAccuracyRatio >= 0.45) {
    return {
      aggressionMultiplier: 1.22,
      lootDropBonus: 0.1,
      directorStateLabel: 'Apex Escalation',
    };
  }
  return {
    aggressionMultiplier: 1.0,
    lootDropBonus: 0.18,
    directorStateLabel: 'Balanced Flow',
  };
}

export interface DamageResult {
  remainingHp: number;
  remainingArmor: number;
  hpLost: number;
  armorLost: number;
  isDowned: boolean;
}

export function applyDamageWithArmor(
  currentHp: number,
  currentArmor: number,
  incomingDamage: number
): DamageResult {
  const dmg = Math.max(0, Math.round(incomingDamage));
  if (dmg === 0) {
    return {
      remainingHp: currentHp,
      remainingArmor: currentArmor,
      hpLost: 0,
      armorLost: 0,
      isDowned: currentHp <= 0,
    };
  }
  const armorAbsorbMax = Math.round(dmg * 0.65);
  const armorLost = Math.min(currentArmor, armorAbsorbMax);
  const remainingArmor = Math.max(0, currentArmor - armorLost);
  const hpLost = Math.min(currentHp, dmg - armorLost);
  const remainingHp = Math.max(0, currentHp - hpLost);

  return {
    remainingHp,
    remainingArmor,
    hpLost,
    armorLost,
    isDowned: remainingHp <= 0,
  };
}

export type PickupType =
  | 'medkit_small'
  | 'medkit_large'
  | 'energy_cell'
  | 'armor_vest'
  | 'speed_booster'
  | 'damage_enhancer'
  | 'scrap_cache'
  | 'mystery_crate';

export interface PickupSpec {
  type: PickupType;
  label: string;
  colorHex: string;
  description: string;
}

export const PICKUP_CATALOG: Record<PickupType, PickupSpec> = {
  medkit_small: {
    type: 'medkit_small',
    label: 'First-Aid Injector (+30 HP)',
    colorHex: '#22c55e',
    description: 'Restores 30 Health immediately.',
  },
  medkit_large: {
    type: 'medkit_large',
    label: 'Trauma Med-Pack (+75 HP)',
    colorHex: '#10b981',
    description: 'Restores 75 Health and clears exhaustion.',
  },
  energy_cell: {
    type: 'energy_cell',
    label: 'Tactical Ammo Crate (+Full Mag)',
    colorHex: '#38bdf8',
    description: 'Refills magazine and restores reserve ammo.',
  },
  armor_vest: {
    type: 'armor_vest',
    label: 'Composite Armor Plate (+50 Armor)',
    colorHex: '#6366f1',
    description: 'Reinforces tactical vest by +50 Armor.',
  },
  speed_booster: {
    type: 'speed_booster',
    label: 'Adrenaline Surge (+30% Speed 15s)',
    colorHex: '#eab308',
    description: 'Boosts movement and reload speed for 15 seconds.',
  },
  damage_enhancer: {
    type: 'damage_enhancer',
    label: 'Overcharge Core (1.5x Damage 15s)',
    colorHex: '#f43f5e',
    description: 'Increases weapon damage by 50% for 15 seconds.',
  },
  scrap_cache: {
    type: 'scrap_cache',
    label: 'Tech Scrap Cache (+85 Scrap)',
    colorHex: '#f97316',
    description: 'Used at the Equipment Upgrade Station.',
  },
  mystery_crate: {
    type: 'mystery_crate',
    label: 'Military Supply Crate',
    colorHex: '#a855f7',
    description: 'Unlocks a random high-tier Sniper, Shotgun, or SCAR-X Projector.',
  },
};

export interface CampusZoneSpec {
  id: string;
  nodeGroupName: string;
  displayName: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  elevationRange: [number, number];
  tacticalNotes: string;
}

export const CAMPUS_ATLAS_ZONES: CampusZoneSpec[] = [
  {
    id: 'gate_roads',
    nodeGroupName: '01_Terrain_Roads_And_Gate',
    displayName: 'Main South Gate & Perimeter Road',
    bounds: { minX: -90, maxX: 90, minZ: 52, maxZ: 78 },
    elevationRange: [0.0, 6.2],
    tacticalNotes: '7.5m asphalt perimeter road, guard booth, and overhead Main Entrance Gate Arch.',
  },
  {
    id: 'block_b_central',
    nodeGroupName: '02_Academic_Block_B_Central',
    displayName: 'Central Academic Block B & Monument Arch',
    bounds: { minX: -28, maxX: 28, minZ: -38, maxZ: -6 },
    elevationRange: [0.0, 14.5],
    tacticalNotes: 'Enterable 3-story hub with circular monument arch, Ground Table-Tennis Undercroft, and walkable staircases to 2nd & 3rd floor Skybridges.',
  },
  {
    id: 'block_a_west',
    nodeGroupName: '03_Academic_Block_A_West',
    displayName: 'West Academic Block A & Lecture Hall',
    bounds: { minX: -66, maxX: -30, minZ: -30, maxZ: 28 },
    elevationRange: [0.0, 14.2],
    tacticalNotes: 'Enterable multi-story West wing with furnished Ground Lecture Classroom, staircases up to 2nd/3rd floors, and West Skybridge access.',
  },
  {
    id: 'block_c_east',
    nodeGroupName: '04_Academic_Block_C_East',
    displayName: 'East Academic Block C & Courtyard',
    bounds: { minX: 30, maxX: 66, minZ: -30, maxZ: 28 },
    elevationRange: [0.0, 14.2],
    tacticalNotes: 'Enterable East engineering wing with open doorways, interior staircases to upper balconies, and East Skybridge connection.',
  },
  {
    id: 'basement_garage',
    nodeGroupName: '05_Basement_Garage_And_Sports',
    displayName: 'Subterranean Garage Ramp & Table Tennis Bay',
    bounds: { minX: -54, maxX: -18, minZ: 28, maxZ: 54 },
    elevationRange: [-3.6, 1.3],
    tacticalNotes: 'Walkable striped vehicle ramp descending to Y = -3.6m underground garage & sports hall.',
  },
  {
    id: 'cafeteria_kiosk',
    nodeGroupName: '06_Cafeteria_FoodCourt_Kiosk',
    displayName: 'East Cafeteria, Food Court & Chai Life Kiosk',
    bounds: { minX: 28, maxX: 74, minZ: 28, maxZ: 64 },
    elevationRange: [0.0, 5.2],
    tacticalNotes: 'Enterable Food Court pavilion and signature Blue Chai Life Kiosk with open archways.',
  },
  {
    id: 'sports_amphitheater',
    nodeGroupName: '07_Sports_Amphitheater_Tower',
    displayName: 'North Sports Ground, Amphitheater & Water Tower',
    bounds: { minX: -84, maxX: 84, minZ: -78, maxZ: -38 },
    elevationRange: [0.0, 23.4],
    tacticalNotes: 'Cricket pitch, walkable 9-tier Stone Amphitheater steps, and walkable Sniper Stairway up the Water Tower platform.',
  },
  {
    id: 'quadrangle_badminton',
    nodeGroupName: '08_Quadrangle_Badminton',
    displayName: 'Central Flagpole Quadrangle & Badminton Courts',
    bounds: { minX: -29, maxX: 29, minZ: -6, maxZ: 48 },
    elevationRange: [0.0, 11.5],
    tacticalNotes: 'Central Flagpole Plaza flanked by West & East outdoor green Badminton Courts.',
  },
];

export function findCampusZoneAtPosition(x: number, z: number): CampusZoneSpec {
  for (const zone of CAMPUS_ATLAS_ZONES) {
    if (
      x >= zone.bounds.minX &&
      x <= zone.bounds.maxX &&
      z >= zone.bounds.minZ &&
      z <= zone.bounds.maxZ
    ) {
      return zone;
    }
  }
  return CAMPUS_ATLAS_ZONES[7];
}

export interface AABB2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface WallCollider3D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  label?: string;
}

export interface StairRampCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'x' | 'z';
  startCoord: number;
  endCoord: number;
  startY: number;
  endY: number;
}

export interface FloorSlabCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  elevationY: number;
}

export function resolveXZCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AABB2D[]
): { x: number; z: number; collided: boolean } {
  let outX = Math.max(-87, Math.min(87, x));
  let outZ = Math.max(-76, Math.min(72, z));
  let collided = false;

  for (const box of colliders) {
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

export function resolve3DMovement(
  targetX: number,
  currentY: number,
  targetZ: number,
  radius: number,
  walls: WallCollider3D[],
  stairs: StairRampCollider[],
  floors: FloorSlabCollider[]
): { x: number; y: number; z: number; collided: boolean; onStairs: boolean } {
  let outX = Math.max(-87, Math.min(87, targetX));
  let outZ = Math.max(-76, Math.min(72, targetZ));
  let collided = false;

  let stairElevation: number | null = null;
  for (const s of stairs) {
    if (outX >= s.minX && outX <= s.maxX && outZ >= s.minZ && outZ <= s.maxZ) {
      const coord = s.axis === 'z' ? outZ : outX;
      const span = s.endCoord - s.startCoord;
      const t = span !== 0 ? Math.max(0, Math.min(1, (coord - s.startCoord) / span)) : 0;
      const yAtStair = s.startY + t * (s.endY - s.startY);
      if (Math.abs(currentY - yAtStair) <= 2.2) {
        stairElevation = yAtStair;
        break;
      }
    }
  }

  const effectiveY = stairElevation !== null ? stairElevation : currentY;

  for (const wall of walls) {
    if (wall.maxY <= effectiveY + 0.25 || wall.minY >= effectiveY + 1.6) {
      continue;
    }

    const closestX = Math.max(wall.minX, Math.min(outX, wall.maxX));
    const closestZ = Math.max(wall.minZ, Math.min(outZ, wall.maxZ));
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
        const leftPen = Math.abs(outX - wall.minX);
        const rightPen = Math.abs(wall.maxX - outX);
        const topPen = Math.abs(outZ - wall.minZ);
        const bottomPen = Math.abs(wall.maxZ - outZ);
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === leftPen) outX = wall.minX - radius;
        else if (minPen === rightPen) outX = wall.maxX + radius;
        else if (minPen === topPen) outZ = wall.minZ - radius;
        else outZ = wall.maxZ + radius;
      }
    }
  }

  let finalY = 0;
  let onStairs = false;

  for (const s of stairs) {
    if (outX >= s.minX && outX <= s.maxX && outZ >= s.minZ && outZ <= s.maxZ) {
      const coord = s.axis === 'z' ? outZ : outX;
      const span = s.endCoord - s.startCoord;
      const t = span !== 0 ? Math.max(0, Math.min(1, (coord - s.startCoord) / span)) : 0;
      const yAtStair = s.startY + t * (s.endY - s.startY);
      if (Math.abs(currentY - yAtStair) <= 2.2) {
        finalY = Number(yAtStair.toFixed(3));
        onStairs = true;
        break;
      }
    }
  }

  if (!onStairs) {
    let bestSlabY: number | null = null;
    for (const slab of floors) {
      if (outX >= slab.minX && outX <= slab.maxX && outZ >= slab.minZ && slab.maxZ >= outZ) {
        if (slab.elevationY <= currentY + 1.25) {
          if (bestSlabY === null || slab.elevationY > bestSlabY) {
            bestSlabY = slab.elevationY;
          }
        }
      }
    }
    if (bestSlabY !== null) {
      if (currentY > bestSlabY + 0.4) {
        finalY = Math.max(bestSlabY, Number((currentY - 0.35).toFixed(3)));
      } else {
        finalY = bestSlabY;
      }
    } else {
      finalY = currentY > 0.4 ? Math.max(0, Number((currentY - 0.35).toFixed(3))) : 0;
    }
  }

  return { x: outX, y: finalY, z: outZ, collided, onStairs };
}
