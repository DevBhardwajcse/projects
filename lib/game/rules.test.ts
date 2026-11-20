import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWeaponStats,
  getWaveDefinition,
  evaluateDynamicDifficulty,
  applyDamageWithArmor,
  findCampusZoneAtPosition,
  resolveXZCollision,
  resolve3DMovement,
  rollCreepyZombieTier,
  WEAPON_SPECS,
} from './rules';

test('custom weapons span Sniper, Shotgun, Mid-Range, and Long-Range categories and scale across Levels 1-5', () => {
  const categories = new Set(Object.values(WEAPON_SPECS).map((w) => w.category));
  assert.ok(categories.has('Sniper'));
  assert.ok(categories.has('Shotgun'));
  assert.ok(categories.has('Mid-Range'));
  assert.ok(categories.has('Long-Range'));

  const lvl1 = computeWeaponStats('sniper_bolt', 1);
  const lvl5 = computeWeaponStats('sniper_bolt', 5);
  assert.ok(lvl5.damage > lvl1.damage);
  assert.ok(lvl5.capacity > lvl1.capacity);
  assert.equal(lvl5.nextUpgradeCost, null);
});

test('creepy zombie tier probabilities follow exact 70% Low, 20% Mid, 10% Hard distribution', () => {
  assert.equal(rollCreepyZombieTier(() => 0.0), 'low');
  assert.equal(rollCreepyZombieTier(() => 0.699), 'low');
  assert.equal(rollCreepyZombieTier(() => 0.70), 'mid');
  assert.equal(rollCreepyZombieTier(() => 0.899), 'mid');
  assert.equal(rollCreepyZombieTier(() => 0.90), 'hard');
  assert.equal(rollCreepyZombieTier(() => 0.999), 'hard');
});

test('3D staircase and wall physics allow climbing stairs and entering doorways while walls block', () => {
  const walls = [
    { minX: -10, maxX: 10, minZ: -5, maxZ: -4.4, minY: 0, maxY: 4.2, label: 'North Wall' },
  ];
  const stairs = [
    {
      id: 'test_stair',
      minX: 0,
      maxX: 3,
      minZ: 0,
      maxZ: 8,
      axis: 'z' as const,
      startCoord: 0,
      endCoord: 8,
      startY: 0,
      endY: 4.2,
    },
  ];
  const floors = [
    { id: 'second_floor', minX: -10, maxX: 10, minZ: 8, maxZ: 16, elevationY: 4.2 },
  ];

  // Midpoint on staircase (z = 4) should elevate actor to Y = 2.1m
  const onStair = resolve3DMovement(1.5, 1.8, 4.0, 0.5, walls, stairs, floors);
  assert.equal(onStair.onStairs, true);
  assert.equal(onStair.y, 2.1);

  // Top of staircase stepping onto 2nd floor slab (z = 9) should keep actor at Y = 4.2m
  const onUpperFloor = resolve3DMovement(1.5, 4.0, 9.0, 0.5, walls, stairs, floors);
  assert.equal(onUpperFloor.y, 4.2);

  // Walking into wall at ground level should collide
  const wallHit = resolve3DMovement(0, 0, -4.5, 0.5, walls, stairs, floors);
  assert.equal(wallHit.collided, true);
});

test('wave progression spawns Mini-Boss on Wave 5, Skull-Drake on Wave 8, and Final Destroyer on Wave 10', () => {
  assert.equal(getWaveDefinition(5, 'normal', 'single').bossToSpawn, 'mini_boss_wave5');
  assert.equal(getWaveDefinition(8, 'normal', 'single').bossToSpawn, 'elite_boss_wave8');
  assert.equal(getWaveDefinition(10, 'normal', 'single').bossToSpawn, 'final_boss_wave10');
});

test('dynamic difficulty director and armor absorption work accurately', () => {
  const mercy = evaluateDynamicDifficulty({
    playerHpRatio: 0.2,
    recentKillsPerMin: 5,
    playerAccuracyRatio: 0.3,
    timesDowned: 1,
  });
  assert.equal(mercy.directorStateLabel, 'Mercy Assist');

  const dmg = applyDamageWithArmor(100, 50, 40);
  assert.ok(dmg.armorLost > 0);
  assert.ok(dmg.remainingHp < 100);
});

test('campus 3D atlas coordinate lookup and 2D collision work accurately', () => {
  const zone = findCampusZoneAtPosition(0, -20);
  assert.equal(zone.nodeGroupName, '02_Academic_Block_B_Central');
  const res = resolveXZCollision(0, 0, 1, [{ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }]);
  assert.equal(res.collided, true);
});
