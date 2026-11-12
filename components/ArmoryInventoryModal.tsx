'use client';

import React, { useState } from 'react';
import {
  FICTIONAL_EQUIPMENT_ARSENAL,
  computeWeaponStats,
  CAMPUS_ATLAS_ZONES,
  ItemRarity,
} from '@/lib/game/rules';
import {
  Wrench,
  Backpack,
  Users,
  Trophy,
  X,
  Check,
  Lock,
  ArrowUpCircle,
  HeartPulse,
  Shield,
  Zap,
  Copy,
} from 'lucide-react';

export interface InventoryItemEntry {
  id: string;
  name: string;
  rarity: ItemRarity;
  quantity: number;
  description: string;
  actionType: 'heal_75' | 'armor_50' | 'speed_boost' | 'shield_boost' | 'energy_refill';
}

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface ArmoryInventoryModalProps {
  open: boolean;
  initialTab?: 'armory' | 'inventory' | 'lobby' | 'progression';
  onClose: () => void;
  scrap: number;
  playerLevel: number;
  playerXp: number;
  bestWave: number;
  totalKills: number;
  bossesDefeated: number;
  unlockedWeapons: string[];
  weaponLevels: Record<string, number>;
  equippedWeaponId: string;
  onEquipWeapon: (id: string) => void;
  onUnlockWeapon: (id: string, cost: number) => void;
  onUpgradeWeapon: (id: string, cost: number) => void;
  inventory: InventoryItemEntry[];
  onUseInventoryItem: (itemId: string) => void;
  // Multiplayer Lobby props
  roomCode: string;
  isPublicRoom: boolean;
  onTogglePublicRoom: () => void;
  onJoinRoomCode: (code: string) => void;
  squadCount: number;
  onChangeSquadCount: (count: number) => void;
  selectedSuitIndex: number;
  onSelectSuit: (index: number) => void;
  achievements: AchievementEntry[];
}

const RARITY_TEXT_COLORS: Record<ItemRarity, string> = {
  common: 'text-stone-300',
  uncommon: 'text-emerald-400',
  rare: 'text-sky-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
};

const SUIT_OPTIONS = [
  { name: 'Vanguard Recon (Slate)', suitHex: '#1e293b', vestHex: '#334155', role: 'Balanced Mobility' },
  { name: 'Hazard Medic (Emerald)', suitHex: '#14532d', vestHex: '#166534', role: '+20% Medkit Efficiency' },
  { name: 'Aegis Heavy (Cobalt)', suitHex: '#1e3a8a', vestHex: '#1d4ed8', role: '+15% Armor Absorption' },
  { name: 'Crimson Stalker (Obsidian)', suitHex: '#3f1d1d', vestHex: '#7f1d1d', role: '+10% Energy Recharge' },
];

export default function ArmoryInventoryModal({
  open,
  initialTab = 'armory',
  onClose,
  scrap,
  playerLevel,
  playerXp,
  bestWave,
  totalKills,
  bossesDefeated,
  unlockedWeapons,
  weaponLevels,
  equippedWeaponId,
  onEquipWeapon,
  onUnlockWeapon,
  onUpgradeWeapon,
  inventory,
  onUseInventoryItem,
  roomCode,
  isPublicRoom,
  onTogglePublicRoom,
  onJoinRoomCode,
  squadCount,
  onChangeSquadCount,
  selectedSuitIndex,
  onSelectSuit,
  achievements,
}: ArmoryInventoryModalProps) {
  const [tab, setTab] = useState<'armory' | 'inventory' | 'lobby' | 'progression'>(initialTab);
  const [joinInput, setJoinInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Armory, Inventory & Co-op Lobby"
    >
      <div className="w-full max-w-4xl bg-stone-950 border border-stone-700 text-stone-100 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 border-b border-stone-800">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-lg font-bold tracking-wider uppercase font-mono text-amber-400">
                Survivor Command Terminal
              </h2>
              <p className="text-xs text-stone-400 font-mono tabular-nums">
                LV.{playerLevel} ({playerXp} XP) · SCRAP CURRENCY: {scrap} · BEST WAVE: {bestWave}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Command Terminal"
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-stone-800 bg-stone-900/60">
          <button
            type="button"
            onClick={() => setTab('armory')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'armory'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span>Equipment & Upgrades</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('inventory')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'inventory'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Backpack className="w-4 h-4 shrink-0" />
            <span>Inventory ({inventory.reduce((a, b) => a + b.quantity, 0)})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('lobby')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'lobby'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Co-op Lobby ({squadCount}P)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('progression')}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'progression'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span>Records & Campus Atlas</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: EQUIPMENT UPGRADES */}
          {tab === 'armory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-stone-400 pb-2 border-b border-stone-800">
                <span>FICTIONAL ARCADE ENERGY ARSENAL (LEVELS 1–5)</span>
                <span className="text-amber-400 font-bold tabular-nums">AVAILABLE SCRAP: {scrap}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FICTIONAL_EQUIPMENT_ARSENAL.map((spec) => {
                  const isUnlocked = unlockedWeapons.includes(spec.id);
                  const lv = weaponLevels[spec.id] || 1;
                  const stats = computeWeaponStats(spec, lv);
                  const isEquipped = equippedWeaponId === spec.id;

                  return (
                    <div
                      key={spec.id}
                      className={`p-4 border flex flex-col justify-between gap-3 ${
                        isEquipped
                          ? 'bg-stone-900 border-amber-500'
                          : 'bg-stone-900/50 border-stone-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-sm text-stone-100">
                            {spec.name}
                          </span>
                          <span
                            className={`text-xs font-mono uppercase ${
                              RARITY_TEXT_COLORS[spec.rarity]
                            }`}
                          >
                            {spec.rarity} · Lv.{stats.level} ({stats.levelName})
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {spec.category} · {spec.roleClue}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-stone-800/80 text-xs font-mono tabular-nums">
                          <div>
                            <span className="text-stone-500 block text-[10px]">DAMAGE</span>
                            <span className="text-stone-200 font-bold">{stats.damage}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">CAPACITY</span>
                            <span className="text-stone-200 font-bold">{stats.energyCapacity}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">RECHARGE</span>
                            <span className="text-stone-200 font-bold">{stats.rechargeTime}s</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        {!isUnlocked ? (
                          <button
                            type="button"
                            disabled={scrap < spec.unlockCost}
                            onClick={() => onUnlockWeapon(spec.id, spec.unlockCost)}
                            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock ({spec.unlockCost} Scrap)</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEquipWeapon(spec.id)}
                              className={`flex-1 py-2 px-3 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
                                isEquipped
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isEquipped ? 'Equipped' : 'Equip'}</span>
                            </button>

                            {stats.nextUpgradeCost !== null ? (
                              <button
                                type="button"
                                disabled={scrap < stats.nextUpgradeCost}
                                onClick={() =>
                                  onUpgradeWeapon(spec.id, stats.nextUpgradeCost!)
                                }
                                className="py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-mono font-bold text-xs uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                <span>Lv.{stats.level + 1} ({stats.nextUpgradeCost})</span>
                              </button>
                            ) : (
                              <span className="py-2 px-3 bg-stone-800 text-amber-400 font-mono font-bold text-xs uppercase">
                                MAX LV.5
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {tab === 'inventory' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-stone-400 pb-2 border-b border-stone-800">
                COLLECTED SURVIVAL SUPPLIES, MEDKITS, ARMOR PLATES & BOOSTERS
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-stone-900 border border-stone-800 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.actionType === 'heal_75' ? (
                          <HeartPulse className="w-4 h-4 text-emerald-400" />
                        ) : item.actionType === 'armor_50' ? (
                          <Shield className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Zap className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-mono font-bold text-sm text-stone-100">
                          {item.name}
                        </span>
                        <span className={`text-xs font-mono uppercase ${RARITY_TEXT_COLORS[item.rarity]}`}>
                          · {item.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">{item.description}</p>
                      <div className="text-xs font-mono text-stone-300 tabular-nums">
                        Quantity Available: <strong className="text-amber-400">{item.quantity}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={item.quantity <= 0}
                      onClick={() => onUseInventoryItem(item.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 text-white font-mono font-bold text-xs uppercase cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Use Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MULTIPLAYER CO-OP LOBBY & CHARACTER CUSTOMIZATION */}
          {tab === 'lobby' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Room Management */}
                <div className="p-4 bg-stone-900 border border-stone-800 space-y-4">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase">
                    Cooperative Room & Cross-Tab Sync
                  </div>
                  <div className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800">
                    <div>
                      <span className="text-[11px] font-mono text-stone-400 block">
                        ACTIVE ROOM CODE
                      </span>
                      <span className="text-lg font-mono font-bold text-stone-100 tracking-widest">
                        {roomCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyRoomCode}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs font-mono text-stone-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied!' : 'Copy Invite'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-300">Room Visibility:</span>
                    <button
                      type="button"
                      onClick={onTogglePublicRoom}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 cursor-pointer"
                    >
                      {isPublicRoom ? 'PUBLIC ROOM' : 'PRIVATE SQUAD'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                      placeholder="Enter Room Code (e.g. QUAD-94)"
                      className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 text-xs font-mono text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (joinInput.trim()) {
                          onJoinRoomCode(joinInput.trim());
                          setJoinInput('');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-xs uppercase cursor-pointer"
                    >
                      Join Room
                    </button>
                  </div>
                </div>

                {/* Squad Roster (1 to 4 Players) */}
                <div className="p-4 bg-stone-900 border border-stone-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                      Squad Size (1–4 Survivors)
                    </span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => onChangeSquadCount(cnt)}
                          className={`px-2.5 py-1 text-xs font-mono font-bold cursor-pointer ${
                            squadCount === cnt
                              ? 'bg-amber-500 text-stone-950'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          {cnt}P
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 bg-stone-950 border border-stone-800 flex items-center justify-between">
                      <span>1. YOU (Commander · Human)</span>
                      <span className="text-emerald-400">READY</span>
                    </div>
                    {squadCount >= 2 && (
                      <div className="p-2.5 bg-stone-950 border border-stone-800 flex items-center justify-between">
                        <span>2. Kaelen (Squad Medic · Co-op Sync/AI)</span>
                        <span className="text-emerald-400">READY</span>
                      </div>
                    )}
                    {squadCount >= 3 && (
                      <div className="p-2.5 bg-stone-950 border border-stone-800 flex items-center justify-between">
                        <span>3. Vance (Heavy Suppressor · Co-op Sync/AI)</span>
                        <span className="text-emerald-400">READY</span>
                      </div>
                    )}
                    {squadCount >= 4 && (
                      <div className="p-2.5 bg-stone-950 border border-stone-800 flex items-center justify-between">
                        <span>4. Mira (Recon Marksman · Co-op Sync/AI)</span>
                        <span className="text-emerald-400">READY</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Character Outfit / Suit Selection */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-stone-400 uppercase">
                  Select Survivor Tactical Rig & Specialization
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {SUIT_OPTIONS.map((suit, idx) => (
                    <button
                      key={suit.name}
                      type="button"
                      onClick={() => onSelectSuit(idx)}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        selectedSuitIndex === idx
                          ? 'bg-stone-900 border-amber-500'
                          : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-4 h-4 inline-block border border-white/20"
                          style={{ backgroundColor: suit.suitHex }}
                        />
                        <span className="text-xs font-mono font-bold text-stone-100">
                          {suit.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400">{suit.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROGRESSION, ACHIEVEMENTS & CAMPUS 3D ATLAS */}
          {tab === 'progression' && (
            <div className="space-y-6">
              {/* Career Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                <div className="p-3.5 bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">SURVIVOR LEVEL</span>
                  <span className="text-xl font-bold text-amber-400">LV.{playerLevel}</span>
                </div>
                <div className="p-3.5 bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">BEST SURVIVAL WAVE</span>
                  <span className="text-xl font-bold text-stone-100">WAVE {bestWave}</span>
                </div>
                <div className="p-3.5 bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">HOSTILES DEFEATED</span>
                  <span className="text-xl font-bold text-emerald-400">{totalKills}</span>
                </div>
                <div className="p-3.5 bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">TITAN BOSSES SLAIN</span>
                  <span className="text-xl font-bold text-rose-400">{bossesDefeated}</span>
                </div>
              </div>

              {/* Achievements */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-stone-400 uppercase">
                  Survivor Achievements
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`p-3 border flex items-center justify-between ${
                        ach.unlocked
                          ? 'bg-stone-900 border-amber-500/60 text-stone-100'
                          : 'bg-stone-950 border-stone-800 text-stone-500'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono font-bold">{ach.title}</div>
                        <div className="text-[11px]">{ach.description}</div>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-stone-800">
                        {ach.unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campus 3D Visual Atlas Structural Verification */}
              <div className="space-y-2">
                <div className="text-xs font-mono text-stone-400 uppercase">
                  Active 3D Map: campus_survival_map_3d.glb (180m × 160m Verified Coordinate Sectors)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {CAMPUS_ATLAS_ZONES.map((zone) => (
                    <div
                      key={zone.id}
                      className="p-2.5 bg-stone-900 border border-stone-800 flex items-center justify-between"
                    >
                      <span className="text-stone-200">{zone.name}</span>
                      <span className="text-stone-400 tabular-nums text-[11px]">
                        [{zone.minX}..{zone.maxX}, {zone.minZ}..{zone.maxZ}]m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
