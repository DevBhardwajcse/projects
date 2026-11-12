'use client';

import React, { useEffect, useRef } from 'react';

export interface MinimapEntity {
  x: number;
  z: number;
  type: 'zombie' | 'boss' | 'teammate' | 'teammate_downed' | 'loot' | 'crate';
  label?: string;
}

interface CampusMinimapProps {
  playerX: number;
  playerZ: number;
  playerRotY: number;
  entities: MinimapEntity[];
  expanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Renders an accurate North-Up Orthographic Minimap of the 180m x 160m Campus 3D Visual Atlas
 * (North = -Z at top, South = +Z at bottom, West = -X at left, East = +X at right).
 */
export default function CampusMinimap({
  playerX,
  playerZ,
  playerRotY,
  entities,
  expanded,
  onToggleExpand,
}: CampusMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = expanded ? 380 : 168;
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    // Map world [-90..+90, -80..+74] to canvas [0..size, 0..size]
    const toMapX = (wx: number) => ((wx + 90) / 180) * size;
    const toMapY = (wz: number) => ((wz + 80) / 160) * size;
    const scaleW = (w: number) => (w / 180) * size;
    const scaleH = (d: number) => (d / 160) * size;

    // 1. Turf Background
    ctx.fillStyle = '#1b2e19';
    ctx.fillRect(0, 0, size, size);

    // Subtle tactical coordinate grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let g = -60; g <= 60; g += 30) {
      const gx = toMapX(g);
      const gy = toMapY(g);
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(size, gy);
      ctx.stroke();
    }

    // 2. Interlocking Paver Roads
    ctx.fillStyle = '#475569';
    // Main South-North Avenue
    ctx.fillRect(toMapX(-5.75), toMapY(-18), scaleW(11.5), scaleH(90));
    // Quadrangle Loop
    ctx.fillRect(toMapX(-45), toMapY(14), scaleW(94), scaleH(8));
    // East Avenue
    ctx.fillRect(toMapX(44), toMapY(-52), scaleW(8), scaleH(112));
    // West Sports Access Road
    ctx.fillRect(toMapX(-21.5), toMapY(-46), scaleW(7), scaleH(102));
    // North Service Road
    ctx.fillRect(toMapX(-46), toMapY(-55.5), scaleW(94), scaleH(7));

    // 3. Western Sports Ground & Cricket Pitch ([-78..-20, -56..+56])
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(toMapX(-56), toMapY(18), scaleW(24), 0, Math.PI * 2);
    ctx.stroke();
    // Dirt Cricket Strip
    ctx.fillStyle = '#b48a52';
    ctx.fillRect(toMapX(-57.7), toMapY(8), scaleW(3.4), scaleH(20));

    // 9-Tier Stone Amphitheater (-28, 32)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(toMapX(-28), toMapY(21), scaleW(8.5), scaleH(22));

    // Mushroom Water Tower (-72, -56)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(toMapX(-72), toMapY(-56), Math.max(3, scaleW(5.5)), 0, Math.PI * 2);
    ctx.fill();

    // 4. Three Enterable 4-Story Academic Blocks (Terracotta Red Brick + Grey Monument)
    const drawBlock = (minX: number, minZ: number, w: number, d: number, label: string) => {
      ctx.fillStyle = '#993326';
      ctx.fillRect(toMapX(minX), toMapY(minZ), scaleW(w), scaleH(d));
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(toMapX(minX), toMapY(minZ), scaleW(w), scaleH(d));
      // Central Atrium Cutout
      ctx.fillStyle = '#334155';
      ctx.fillRect(
        toMapX(minX + w * 0.28),
        toMapY(minZ + d * 0.28),
        scaleW(w * 0.44),
        scaleH(d * 0.44)
      );
      if (expanded) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, toMapX(minX + w / 2), toMapY(minZ + d / 2) + 3);
      }
    };

    // Skybridges at Z = -17
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(toMapX(-22), toMapY(-18.5), scaleW(9), scaleH(3));
    ctx.fillRect(toMapX(13), toMapY(-18.5), scaleW(9), scaleH(3));

    drawBlock(-14, -43, 28, 22, 'BLOCK B');
    drawBlock(-44, -23, 24, 22, 'BLOCK A');
    drawBlock(14, -24, 24, 20, 'BLOCK C');

    // 5. Basement Garage & Indoor Sports Hall ([+15..+41, -51..-24])
    ctx.fillStyle = '#475569';
    ctx.fillRect(toMapX(16), toMapY(-51), scaleW(24), scaleH(22));
    // Striped Ramp
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(toMapX(19), toMapY(-36), scaleW(3), scaleH(12));

    // 6. Cafeteria, Food Court & Blue Chai Kiosk ([+11..+40, +10..+37])
    ctx.fillStyle = '#8b3226';
    ctx.fillRect(toMapX(14), toMapY(13), scaleW(16), scaleH(21));
    // Covered Patio
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(toMapX(30), toMapY(13.5), scaleW(8), scaleH(20));
    // Blue Chai Kiosk
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(toMapX(11.8), toMapY(19), scaleW(3.5), scaleH(3.2));

    // 7. Central Flagpole Plaza (0, -8) & Badminton Court (13.5, -8)
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(toMapX(0), toMapY(-8), 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(toMapX(10.5), toMapY(-14.5), scaleW(6), scaleH(13));

    // 8. Main Entrance Gatehouse (0, +70)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(toMapX(-10), toMapY(68), scaleW(20), scaleH(4));

    if (expanded) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CRICKET GROUND', toMapX(-56), toMapY(18) - 14);
      ctx.fillText('AMPHITHEATER', toMapX(-24), toMapY(32));
      ctx.fillText('WATER TOWER', toMapX(-70), toMapY(-62));
      ctx.fillText('CAFETERIA & KIOSK', toMapX(25), toMapY(40));
      ctx.fillText('BASEMENT GARAGE', toMapX(28), toMapY(-54));
      ctx.fillText('MAIN GATE', toMapX(0), toMapY(76));
    }

    // 9. Dynamic Entities (Loot, Squad, Zombies, Boss)
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      const ex = toMapX(ent.x);
      const ey = toMapY(ent.z);

      if (ent.type === 'loot' || ent.type === 'crate') {
        ctx.fillStyle = ent.type === 'crate' ? '#f59e0b' : '#22c55e';
        ctx.fillRect(ex - 2.2, ey - 2.2, 4.4, 4.4);
      } else if (ent.type === 'teammate' || ent.type === 'teammate_downed') {
        ctx.fillStyle = ent.type === 'teammate_downed' ? '#facc15' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'zombie') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'boss') {
        ctx.fillStyle = '#ff2200';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 10. Player Position & Viewing Cone
    const px = toMapX(playerX);
    const py = toMapY(playerZ);

    ctx.save();
    ctx.translate(px, py);
    // In our 3D world, rotY=0 faces -Z (North = Up on canvas)
    ctx.rotate(-playerRotY);

    // View cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -20);
    ctx.lineTo(10, -20);
    ctx.closePath();
    ctx.fill();

    // Player chevron arrow
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -5.5);
    ctx.lineTo(4.5, 4.5);
    ctx.lineTo(0, 2.2);
    ctx.lineTo(-4.5, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [playerX, playerZ, playerRotY, entities, expanded]);

  return (
    <div
      className="relative border-2 border-stone-700/90 bg-stone-950/95 shadow-lg pointer-events-auto"
      style={{ width: expanded ? 384 : 172, height: expanded ? 384 : 172 }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Cardinal Compass Markings */}
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-amber-400 pointer-events-none">
        N
      </span>
      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-stone-400 pointer-events-none">
        S
      </span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-stone-400 pointer-events-none">
        W
      </span>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-stone-400 pointer-events-none">
        E
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onToggleExpand();
        }}
        tabIndex={-1}
        aria-label={expanded ? 'Collapse Campus Map' : 'Expand Campus Map'}
        className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-stone-700 cursor-pointer"
      >
        {expanded ? 'MIN [M]' : 'MAP [M]'}
      </button>
    </div>
  );
}
