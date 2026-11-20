'use client';

import {
  WEAPON_SPECS,
  CREEPY_ZOMBIE_TIERS,
  CAMPUS_ATLAS_ZONES,
  BOSS_SPECS,
} from './rules';

/**
 * Generates and downloads a complete, self-contained single-file HTML5 + Three.js
 * deployable website (`campus-last-stand-deploy.html`) containing the entire 3D Campus
 * map, enterable buildings, walkable staircases, custom Sniper/Shotgun/Mid/Long weapons,
 * First-Person POV zoom, Left/Right arrow view controls, and 70/20/10 Creepy Zombies.
 */
export function downloadDeployableWebsiteFile() {
  const weaponsJson = JSON.stringify(WEAPON_SPECS);
  const tiersJson = JSON.stringify(CREEPY_ZOMBIE_TIERS);
  const zonesJson = JSON.stringify(CAMPUS_ATLAS_ZONES);
  const bossesJson = JSON.stringify(BOSS_SPECS);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campus: Last Stand — 3D Zombie & Titan Survival (Deployable Website Edition)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: #090c10; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; user-select: none; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="hud" class="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
    <div class="flex items-start justify-between gap-4">
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 pointer-events-auto">
        <div class="text-xs font-mono uppercase tracking-widest text-amber-400">CAMPUS: LAST STAND • DEPLOYABLE EDITION</div>
        <div id="zoneText" class="text-sm font-bold text-white mt-0.5">08_Quadrangle_Badminton (Elevation: 0.0m)</div>
        <div class="text-[11px] font-mono text-slate-400 mt-1">
          WASD: Move • Left/Right Arrows: Turn View • [V]: Toggle 1st/3rd Person POV • Right-Click/[Z]: Scope Zoom • [1-9,0]: Custom Weapons
        </div>
      </div>
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-right pointer-events-auto">
        <div id="waveText" class="text-sm font-bold text-amber-400">WAVE 1 • CREEPY SPAWN (70% LOW / 20% MID / 10% HARD)</div>
        <div id="scoreText" class="text-xs font-mono text-slate-300 mt-1">SCORE: 0 • SCRAP: 250 • KILLS: 0</div>
        <div class="flex gap-2 mt-2 justify-end">
          <button id="povBtn" class="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-400/50 text-xs font-mono text-sky-300">POV: 3RD PERSON [V]</button>
          <button id="zoomBtn" class="px-2.5 py-1 rounded bg-pink-500/20 border border-pink-400/50 text-xs font-mono text-pink-300">ZOOM SCOPE [Z]</button>
        </div>
      </div>
    </div>

    <!-- Sniper Scope Reticle Overlay -->
    <div id="scopeOverlay" class="hidden fixed inset-0 pointer-events-none items-center justify-center">
      <div class="w-[460px] h-[460px] rounded-full border-4 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(4,7,12,0.86)] relative flex items-center justify-center">
        <div class="absolute inset-x-0 h-[1px] bg-emerald-400/70"></div>
        <div class="absolute inset-y-0 w-[1px] bg-emerald-400/70"></div>
        <div class="w-3 h-3 rounded-full border border-rose-500 bg-rose-500/40"></div>
        <div class="absolute bottom-8 text-[11px] font-mono text-emerald-300 tracking-widest">OPTICAL SNIPER TELEMETRY • FIRST-PERSON POV</div>
      </div>
    </div>

    <div class="flex items-end justify-between gap-4">
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 w-72 pointer-events-auto">
        <div class="flex justify-between text-xs font-mono mb-1">
          <span class="text-emerald-400">HEALTH</span>
          <span id="hpVal">100 / 100</span>
        </div>
        <div class="w-full h-2.5 bg-slate-900 rounded overflow-hidden mb-2">
          <div id="hpBar" class="h-full bg-emerald-500 transition-all" style="width:100%"></div>
        </div>
        <div class="flex justify-between text-xs font-mono">
          <span class="text-sky-400">FLOOR ELEVATION</span>
          <span id="elevVal">0.0m (Ground)</span>
        </div>
      </div>

      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 pointer-events-auto text-right">
        <div id="weaponCat" class="text-[10px] font-mono uppercase tracking-widest text-sky-400">MID-RANGE</div>
        <div id="weaponName" class="text-base font-bold text-white">M4-Vanguard Pulse Carbine</div>
        <div id="ammoText" class="text-lg font-mono font-bold text-amber-400">32 / 32</div>
        <div id="weaponBar" class="flex flex-wrap gap-1 mt-2 max-w-xl justify-end"></div>
      </div>
    </div>
  </div>

  <script>
    const WEAPONS = ${weaponsJson};
    const CREEPY_TIERS = ${tiersJson};
    const ZONES = ${zonesJson};
    const BOSSES = ${bossesJson};
    const weaponKeys = Object.keys(WEAPONS);

    let currentWeaponIdx = 0;
    let povMode = 'tpp';
    let isZoomed = false;
    let hp = 100, score = 0, scrap = 250, kills = 0, wave = 1;
    let ammo = WEAPONS[weaponKeys[0]].baseCapacity;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b121e);
    scene.fog = new THREE.FogExp2(0x0b121e, 0.0065);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.15, 360);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.9));
    const sun = new THREE.DirectionalLight(0xfef08a, 1.3);
    sun.position.set(45, 75, 35);
    scene.add(sun);

    // Ground & Enterable Multi-Story Campus with Walkable Staircases
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(185, 165), new THREE.MeshStandardMaterial({ color: 0x3b6230 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const walls = [];
    const stairs = [];
    const floors = [];
    const matWall = new THREE.MeshStandardMaterial({ color: 0xd6d3cd });
    const matBrick = new THREE.MeshStandardMaterial({ color: 0x9b4d3a });
    const matStair = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

    function addWall(minX, maxX, minZ, maxZ, minY, maxY, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ), mat || matWall);
      m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      scene.add(m);
      walls.push({ minX, maxX, minZ, maxZ, minY, maxY });
    }
    function addFloor(minX, maxX, minZ, maxZ, y) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.35, maxZ - minZ), matWall);
      m.position.set((minX + maxX) / 2, y - 0.17, (minZ + maxZ) / 2);
      scene.add(m);
      floors.push({ minX, maxX, minZ, maxZ, elevationY: y });
    }
    function addStair(minX, maxX, minZ, maxZ, startZ, endZ, startY, endY) {
      stairs.push({ minX, maxX, minZ, maxZ, startCoord: startZ, endCoord: endZ, startY, endY });
      for (let i = 0; i < 14; i++) {
        const t = (i + 0.5) / 14;
        const z = startZ + t * (endZ - startZ);
        const y = startY + t * (endY - startY);
        const step = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.25, Math.abs(endZ - startZ) / 14), i % 2 ? matWall : matStair);
        step.position.set((minX + maxX) / 2, y, z);
        scene.add(step);
      }
    }

    // Block B Central + Walkable Stairs to 2nd Floor (4.2m) & 3rd Floor Skybridges (8.4m)
    addFloor(-24, -6, -34, -10, 4.2);
    addFloor(6, 24, -34, -10, 4.2);
    addFloor(-24, 24, -25, -18, 8.4);
    addWall(-24, -7, -10.6, -10, 0, 12, matBrick);
    addWall(7, 24, -10.6, -10, 0, 12, matBrick);
    addWall(-24, -7, -34, -33.4, 0, 12, matWall);
    addWall(7, 24, -34, -33.4, 0, 12, matWall);
    addStair(-3.5, 3.5, -26, -12, -12, -26, 0, 4.2);
    addStair(-9.5, -6, -32, -18, -32, -18, 4.2, 8.4);
    addStair(6, 9.5, -32, -18, -32, -18, 4.2, 8.4);

    // Block A West & Block C East Enterable + Stairs + Skybridges
    addFloor(-60, -34, -26, 22, 4.2);
    addFloor(34, 60, -26, 22, 4.2);
    addFloor(-34, -24, -24, -19, 8.4);
    addFloor(24, 34, -24, -19, 8.4);
    addStair(-39, -35, -6, 10, 10, -6, 0, 4.2);
    addStair(35, 39, -6, 10, 10, -6, 0, 4.2);

    const player = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    pBody.position.y = 0.85;
    player.add(pBody);
    player.position.set(0, 0, 16);
    scene.add(player);

    const keys = {};
    let yaw = 0, pitch = 0.22;
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      keys[e.key] = true;
      if (e.code === 'KeyV') togglePov();
      if (e.code === 'KeyZ') toggleZoom();
      if (e.key >= '1' && e.key <= '9') selectWeapon(parseInt(e.key, 10) - 1);
      if (e.key === '0') selectWeapon(9);
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      keys[e.key] = false;
    });
    window.addEventListener('mousedown', e => {
      if (e.button === 2) toggleZoom();
      else if (e.button === 0) shoot();
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    function togglePov() {
      povMode = povMode === 'tpp' ? 'fpp' : 'tpp';
      document.getElementById('povBtn').textContent = 'POV: ' + (povMode === 'fpp' ? '1ST PERSON [V]' : '3RD PERSON [V]');
    }
    function toggleZoom() {
      isZoomed = !isZoomed;
      const w = WEAPONS[weaponKeys[currentWeaponIdx]];
      document.getElementById('scopeOverlay').className = (isZoomed && w.hasScopeOverlay)
        ? 'fixed inset-0 pointer-events-none flex items-center justify-center'
        : 'hidden';
    }
    function selectWeapon(idx) {
      if (idx < 0 || idx >= weaponKeys.length) return;
      currentWeaponIdx = idx;
      const w = WEAPONS[weaponKeys[idx]];
      ammo = w.baseCapacity;
      document.getElementById('weaponCat').textContent = w.category;
      document.getElementById('weaponName').textContent = w.name;
      document.getElementById('ammoText').textContent = ammo + ' / ' + w.baseCapacity;
      renderWeaponButtons();
    }

    function renderWeaponButtons() {
      const bar = document.getElementById('weaponBar');
      bar.innerHTML = '';
      weaponKeys.forEach((k, i) => {
        const w = WEAPONS[k];
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 rounded text-[10px] font-mono border ' + (i === currentWeaponIdx ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold' : 'bg-slate-900 text-slate-300 border-slate-700');
        btn.textContent = ((i + 1) % 10) + ': ' + w.category.slice(0,4) + ' ' + w.name.split(' ')[0];
        btn.onclick = () => selectWeapon(i);
        bar.appendChild(btn);
      });
    }
    renderWeaponButtons();

    const zombies = [];
    function spawnCreepyZombie() {
      const r = Math.random();
      const tierKey = r < 0.70 ? 'low' : r < 0.90 ? 'mid' : 'hard';
      const tier = CREEPY_TIERS[tierKey];
      const zGroup = new THREE.Group();
      const zMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 1.7, 0.45),
        new THREE.MeshStandardMaterial({ color: tier.colorHex })
      );
      zMesh.position.y = 0.85;
      zGroup.add(zMesh);
      const angle = Math.random() * Math.PI * 2;
      const dist = 24 + Math.random() * 35;
      zGroup.position.set(player.position.x + Math.cos(angle) * dist, 0, player.position.z + Math.sin(angle) * dist);
      scene.add(zGroup);
      zombies.push({ mesh: zGroup, hp: 85 * tier.hpMultiplier, speed: 3.6 * tier.speedMultiplier, tier });
    }
    for (let i = 0; i < 12; i++) spawnCreepyZombie();

    function shoot() {
      if (ammo <= 0) { ammo = WEAPONS[weaponKeys[currentWeaponIdx]].baseCapacity; return; }
      ammo--;
      const w = WEAPONS[weaponKeys[currentWeaponIdx]];
      document.getElementById('ammoText').textContent = ammo + ' / ' + w.baseCapacity;
      const ray = new THREE.Raycaster();
      const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      ray.set(new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z), dir);
      for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];
        const toZ = new THREE.Vector3().subVectors(z.mesh.position, player.position);
        const dist = toZ.length();
        toZ.normalize();
        if (dist <= w.rangeMeters && toZ.dot(dir) > 0.94) {
          z.hp -= w.baseDamage;
          if (z.hp <= 0) {
            scene.remove(z.mesh);
            zombies.splice(i, 1);
            kills++;
            score += z.tier.scoreBonus;
            scrap += z.tier.scrapBonus;
            document.getElementById('scoreText').textContent = 'SCORE: ' + score + ' • SCRAP: ' + scrap + ' • KILLS: ' + kills;
            setTimeout(spawnCreepyZombie, 900);
          }
          break;
        }
      }
    }

    let last = performance.now();
    function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (keys['ArrowLeft'] || keys['KeyQ']) yaw += 2.2 * dt;
      if (keys['ArrowRight'] || keys['KeyE']) yaw -= 2.2 * dt;

      const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const str = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
      if (fwd || str) {
        const vx = (-Math.sin(yaw) * fwd + Math.cos(yaw) * str) * 9.5 * dt;
        const vz = (-Math.cos(yaw) * fwd - Math.sin(yaw) * str) * 9.5 * dt;
        player.position.x += vx;
        player.position.z += vz;
      }
      player.rotation.y = yaw;

      // Staircase & Multi-Floor height resolution
      let targetY = 0;
      for (const s of stairs) {
        if (player.position.x >= s.minX && player.position.x <= s.maxX && player.position.z >= s.minZ && player.position.z <= s.maxZ) {
          const t = Math.max(0, Math.min(1, (player.position.z - s.startCoord) / (s.endCoord - s.startCoord)));
          targetY = s.startY + t * (s.endY - s.startY);
        }
      }
      if (targetY === 0) {
        for (const f of floors) {
          if (player.position.x >= f.minX && player.position.x <= f.maxX && player.position.z >= f.minZ && player.position.z <= f.maxZ && f.elevationY <= player.position.y + 1.3) {
            targetY = Math.max(targetY, f.elevationY);
          }
        }
      }
      player.position.y = targetY;
      document.getElementById('elevVal').textContent = player.position.y.toFixed(1) + 'm';

      const w = WEAPONS[weaponKeys[currentWeaponIdx]];
      const targetFov = isZoomed ? w.zoomFov : (povMode === 'fpp' ? 68 : 60);
      camera.fov += (targetFov - camera.fov) * 0.18;
      camera.updateProjectionMatrix();

      if (povMode === 'fpp' || isZoomed) {
        pBody.visible = false;
        camera.position.set(player.position.x, player.position.y + 1.55, player.position.z);
        camera.lookAt(player.position.x - Math.sin(yaw) * 20, player.position.y + 1.55, player.position.z - Math.cos(yaw) * 20);
      } else {
        pBody.visible = true;
        camera.position.set(player.position.x + Math.sin(yaw) * 7.5, player.position.y + 4.2, player.position.z + Math.cos(yaw) * 7.5);
        camera.lookAt(player.position.x - Math.sin(yaw) * 6, player.position.y + 1.4, player.position.z - Math.cos(yaw) * 6);
      }

      for (const z of zombies) {
        const dx = player.position.x - z.mesh.position.x;
        const dz = player.position.z - z.mesh.position.z;
        const d = Math.hypot(dx, dz) || 1;
        z.mesh.position.x += (dx / d) * z.speed * dt;
        z.mesh.position.z += (dz / d) * z.speed * dt;
        z.mesh.position.y = player.position.y;
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campus-last-stand-deploy.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
