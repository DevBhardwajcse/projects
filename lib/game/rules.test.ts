import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTY_PRESETS,
  FICTIONAL_EQUIPMENT_ARSENAL,
  computeWeaponStats,
  getWaveDefinition,
  evaluateDynamicDifficulty,
  applyDamageWithArmor,
  getCampusZoneName,
  resolveXZCollision,
} from './rules';

test('weapon upgrade progression scales damage, capacity, and recharge cleanly across Levels 1-5', () => {
  const pulse = FICTIONAL_EQUIPMENT_ARSENAL[0];
  const lv1 = computeWeaponStats(pulse, 1);
  const lv3 = computeWeaponStats(pulse, 3);
  const lv5 = computeWeaponStats(pulse, 5);

  assert.equal(lv1.level, 1);
  assert.equal(lv1.levelName, 'Standard');
  assert.equal(lv1.damage, pulse.baseDamage);
  assert.ok(lv1.nextUpgradeCost !== null && lv1.nextUpgradeCost > 0);

  assert.ok(lv3.damage > lv1.damage);
  assert.ok(lv3.energyCapacity > lv1.energyCapacity);
  assert.ok(lv3.rechargeTime < lv1.rechargeTime);

  assert.equal(lv5.level, 5);
  assert.equal(lv5.levelName, 'Legendary');
  assert.equal(lv5.nextUpgradeCost, null);
});

test('wave progression spawns Mini-Boss on Wave 5, Skull-Drake on Wave 8, and Final Destroyer on Wave 10', () => {
  const w1 = getWaveDefinition(1, 'normal');
  const w5 = getWaveDefinition(5, 'normal');
  const w8 = getWaveDefinition(8, 'normal');
  const w10 = getWaveDefinition(10, 'hard');

  assert.equal(w1.bossTier, null);
  assert.equal(w5.bossTier, 1);
  assert.equal(w8.bossTier, 2);
  assert.equal(w10.bossTier, 3);
  assert.ok(w10.totalEnemies > w1.totalEnemies);
});

test('dynamic difficulty director increases threat when player dominates and provides mercy when critical', () => {
  const dominating = evaluateDynamicDifficulty({
    playerHpRatio: 0.95,
    recentKillRatePerMin: 16,
    downedCount: 0,
    baseDifficulty: 'normal',
  });
  assert.ok(dominating.pressureMultiplier > 1.0);
  assert.equal(dominating.spawnEliteOverride, true);

  const struggling = evaluateDynamicDifficulty({
    playerHpRatio: 0.2,
    recentKillRatePerMin: 3,
    downedCount: 2,
    baseDifficulty: 'normal',
  });
  assert.ok(struggling.pressureMultiplier < 1.0);
  assert.ok(struggling.lootBonusChance > 0);
});

test('armor absorbs proportional damage before reducing health and triggers downed at 0 HP', () => {
  const hit1 = applyDamageWithArmor(100, 50, 40, 0.65);
  assert.equal(hit1.armorAbsorbed, 26);
  assert.equal(hit1.newArmor, 24);
  assert.equal(hit1.hpDamageTaken, 14);
  assert.equal(hit1.newHp, 86);
  assert.equal(hit1.isDowned, false);

  const lethalHit = applyDamageWithArmor(20, 0, 35, 0.65);
  assert.equal(lethalHit.newHp, 0);
  assert.equal(lethalHit.isDowned, true);
});

test('campus 3D atlas coordinate lookup matches exact PDF bounds', () => {
  assert.match(getCampusZoneName(0, -32), /Academic Block B/);
  assert.match(getCampusZoneName(-32, -12), /Academic Block A/);
  assert.match(getCampusZoneName(26, -14), /Academic Block C/);
  assert.match(getCampusZoneName(26, 24), /Cafeteria/);
  assert.match(getCampusZoneName(-56, 18), /Cricket Ground/);
});

test('XZ collision resolver pushes actor outside solid wall AABBs', () => {
  const walls = [{ minX: -10, maxX: 10, minZ: -10, maxZ: -8 }];
  const res = resolveXZCollision(0, -7.5, 1.0, walls);
  assert.equal(res.collided, true);
  assert.ok(res.z >= -7.001);
  assert.equal(DIFFICULTY_PRESETS.easy.maxActiveEnemies < DIFFICULTY_PRESETS.hard.maxActiveEnemies, true);
});
