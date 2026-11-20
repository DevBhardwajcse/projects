'use client';

import React, { useState } from 'react';
import {
  X,
  Wrench,
  Package,
  Shield,
  Award,
  Map,
  Users,
  Crosshair,
  Check,
  Download,
} from 'lucide-react';
import {
  WeaponId,
  WeaponCategory,
  WEAPON_SPECS,
  computeWeaponStats,
  PickupType,
  PICKUP_CATALOG,
  CAMPUS_ATLAS_ZONES,
} from '@/lib/game/rules';
import { downloadDeployableWebsiteFile } from '@/lib/game/exportBundle';

interface ArmoryInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrap: number;
  unlockedWeapons: WeaponId[];
  weaponLevels: Record<WeaponId, number>;
  equippedWeapon: WeaponId;
  inventory: Record<PickupType, number>;
  suitColor: string;
  visorColor: string;
  coopBotsCount: number;
  totalKills: number;
  bossesDefeated: number;
  highestWave: number;
  onSelectWeapon: (id: WeaponId) => void;
  onUnlockOrUpgradeWeapon: (id: WeaponId) => void;
  onUseInventoryItem: (type: PickupType) => void;
  onChangeSuit: (suitHex: string, visorHex: string) => void;
  onChangeCoopBots: (count: number) => void;
}

const SUIT_PRESETS = [
  { name: 'Vanguard Blue', suit: '#2563eb', visor: '#38bdf8' },
  { name: 'Crimson Bio-Hazard', suit: '#dc2626', visor: '#facc15' },
  { name: 'Emerald Recon', suit: '#059669', visor: '#6ee7b7' },
  { name: 'Obsidian Spec-Ops', suit: '#18181b', visor: '#f43f5e' },
  { name: 'Solaris Titan-Hunter', suit: '#d97706', visor: '#fef08a' },
];

export default function ArmoryInventoryModal({
  isOpen,
  onClose,
  scrap,
  unlockedWeapons,
  weaponLevels,
  equippedWeapon,
  inventory,
  suitColor,
  visorColor,
  coopBotsCount,
  totalKills,
  bossesDefeated,
  highestWave,
  onSelectWeapon,
  onUnlockOrUpgradeWeapon,
  onUseInventoryItem,
  onChangeSuit,
  onChangeCoopBots,
}: ArmoryInventoryModalProps) {
  const [tab, setTab] = useState<'armory' | 'inventory' | 'coop' | 'atlas'>('armory');
  const [categoryFilter, setCategoryFilter] = useState<'All' | WeaponCategory>('All');

  if (!isOpen) return null;

  const allWeaponIds = (Object.keys(WEAPON_SPECS) as WeaponId[]).filter(
    (wId) => categoryFilter === 'All' || WEAPON_SPECS[wId].category === categoryFilter
  );
  const pickupKeys = Object.keys(PICKUP_CATALOG) as PickupType[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wider uppercase text-white">
                Custom Armory, Upgrade Station & Deployable Bundle
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Snipers • Shotguns • Mid-Range • Long-Range • Levels 1–5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadDeployableWebsiteFile}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Deployable Website (.HTML)
            </button>
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3.5 py-1.5 text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                Available Tech Scrap
              </div>
              <div className="text-base font-bold font-mono text-amber-400">{scrap} SCRAP</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <X className="h-4 w-4" /> ESC
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/60 px-6">
          <button
            onClick={() => setTab('armory')}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition cursor-pointer ${
              tab === 'armory'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="h-4 w-4" /> Custom Weapons (10)
          </button>
          <button
            onClick={() => setTab('inventory')}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition cursor-pointer ${
              tab === 'inventory'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="h-4 w-4" /> Survival Inventory
          </button>
          <button
            onClick={() => setTab('coop')}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition cursor-pointer ${
              tab === 'coop'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" /> Squad & Suit Config
          </button>
          <button
            onClick={() => setTab('atlas')}
            className={`flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-wider border-b-2 transition cursor-pointer ${
              tab === 'atlas'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="h-4 w-4" /> Campus 3D Atlas & Stairs
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'armory' && (
            <div className="space-y-4">
              {/* Weapon Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap gap-2">
                  {(['All', 'Sniper', 'Shotgun', 'Mid-Range', 'Long-Range'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider border transition cursor-pointer ${
                        categoryFilter === cat
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'All' ? 'All Custom Weapons (10)' : `${cat}s`}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Tip: Equip any Sniper & press <span className="text-pink-400">Right-Click / [Z]</span> for 8x First-Person Scope Zoom!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allWeaponIds.map((wId) => {
                  const spec = WEAPON_SPECS[wId];
                  const isUnlocked = unlockedWeapons.includes(wId);
                  const currentLevel = weaponLevels[wId] || 1;
                  const stats = computeWeaponStats(wId, currentLevel);
                  const isEquipped = equippedWeapon === wId;

                  return (
                    <div
                      key={wId}
                      className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                        isEquipped
                          ? 'border-amber-400 bg-amber-950/20'
                          : isUnlocked
                          ? 'border-slate-800 bg-slate-900/90'
                          : 'border-slate-800/60 bg-slate-900/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: spec.colorHex }}
                              />
                              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                {spec.category} • {spec.hasScopeOverlay ? '8x Sniper Scope' : 'Tactical Optics'}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-white mt-0.5">{spec.name}</h3>
                          </div>
                          <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono font-semibold text-amber-400">
                            {isUnlocked ? `LVL ${currentLevel}/5` : 'LOCKED'}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-slate-400">{spec.description}</p>

                        <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-slate-950/80 p-2.5 text-center border border-slate-800/80">
                          <div>
                            <div className="text-[10px] font-mono text-slate-400">DMG</div>
                            <div className="text-xs font-bold font-mono text-rose-400">
                              {stats.damage}
                              {spec.pellets > 1 ? `×${spec.pellets}` : ''}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400">RANGE</div>
                            <div className="text-xs font-bold font-mono text-sky-400">
                              {spec.rangeMeters}m
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400">MAG</div>
                            <div className="text-xs font-bold font-mono text-emerald-400">
                              {stats.capacity}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400">ZOOM FOV</div>
                            <div className="text-xs font-bold font-mono text-amber-300">
                              {spec.zoomFov}°
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {isUnlocked ? (
                          <>
                            <button
                              onClick={() => onSelectWeapon(wId)}
                              className={`flex-1 rounded-lg py-2 text-xs font-mono uppercase font-bold transition cursor-pointer ${
                                isEquipped
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                              }`}
                            >
                              {isEquipped ? 'Equipped' : 'Equip Weapon'}
                            </button>
                            {stats.nextUpgradeCost !== null ? (
                              <button
                                onClick={() => onUnlockOrUpgradeWeapon(wId)}
                                disabled={scrap < stats.nextUpgradeCost}
                                className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-mono font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 cursor-pointer"
                              >
                                Upgrade ({stats.nextUpgradeCost} Scrap)
                              </button>
                            ) : (
                              <span className="px-3 py-2 text-xs font-mono text-emerald-400 font-bold">
                                MAX LEVEL
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => onUnlockOrUpgradeWeapon(wId)}
                            disabled={scrap < spec.unlockCost}
                            className="w-full rounded-lg border border-sky-500/50 bg-sky-500/20 py-2 text-xs font-mono font-bold uppercase text-sky-300 hover:bg-sky-500/30 disabled:opacity-40 cursor-pointer"
                          >
                            Unlock {spec.category} ({spec.unlockCost} Scrap)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pickupKeys.map((pType) => {
                const spec = PICKUP_CATALOG[pType];
                const count = inventory[pType] || 0;
                return (
                  <div
                    key={pType}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-lg border font-mono text-sm font-bold"
                        style={{
                          borderColor: spec.colorHex,
                          backgroundColor: `${spec.colorHex}22`,
                          color: spec.colorHex,
                        }}
                      >
                        ×{count}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{spec.label}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{spec.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onUseInventoryItem(pType)}
                      disabled={count <= 0}
                      className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-950 hover:bg-emerald-400 disabled:opacity-30 cursor-pointer"
                    >
                      Use Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'coop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-sm font-mono uppercase tracking-wider text-sky-400 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Co-Op Squad Size (1–4 Players)
                </h3>
                <p className="text-xs text-slate-400">
                  Deploy with up to 3 allied AI Campus Defenders that patrol staircases, provide covering fire, and assist with revival.
                </p>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[0, 1, 2, 3].map((bots) => (
                    <button
                      key={bots}
                      onClick={() => onChangeCoopBots(bots)}
                      className={`rounded-lg border py-2.5 text-xs font-mono font-bold transition cursor-pointer ${
                        coopBotsCount === bots
                          ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {bots === 0 ? 'Solo (1P)' : `${bots + 1}P Squad`}
                    </button>
                  ))}
                </div>

                <h3 className="text-sm font-mono uppercase tracking-wider text-amber-400 pt-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Survivor Combat Suit & Visor
                </h3>
                <div className="space-y-2">
                  {SUIT_PRESETS.map((preset) => {
                    const selected = suitColor === preset.suit;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => onChangeSuit(preset.suit, preset.visor)}
                        className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-mono transition cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="h-4 w-4 rounded-full border border-white/30"
                            style={{ backgroundColor: preset.suit }}
                          />
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: preset.visor }}
                          />
                          {preset.name}
                        </span>
                        {selected && <Check className="h-4 w-4 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-sm font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Award className="h-4 w-4" /> Creepy Zombie Distribution & Milestones
                </h3>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1.5 text-xs font-mono">
                  <div className="text-slate-300 font-bold">ACTIVE CREEPY ZOMBIE SPAWN RATES:</div>
                  <div className="text-emerald-400">• 70% Low-Level Creepy Shambler (Easy to defeat)</div>
                  <div className="text-amber-400">• 20% Mid-Level Spiked Stalker (Requires skill)</div>
                  <div className="text-rose-400">• 10% Hard-Level Abyssal Terror Fiend (High skill & difficult)</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400">TOTAL KILLS</div>
                    <div className="text-lg font-bold font-mono text-white">{totalKills}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400">TITANS SLAIN</div>
                    <div className="text-lg font-bold font-mono text-rose-400">{bossesDefeated}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400">HIGHEST WAVE</div>
                    <div className="text-lg font-bold font-mono text-amber-400">{highestWave}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'atlas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {CAMPUS_ATLAS_ZONES.map((z) => (
                <div
                  key={z.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {z.nodeGroupName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Elev: {z.elevationRange[0]}m – {z.elevationRange[1]}m
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{z.displayName}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{z.tacticalNotes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
