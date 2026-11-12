import * as THREE from 'three';
import { AABBBox } from './rules';

export interface CampusBuildResult {
  group: THREE.Group;
  colliders: AABBBox[];
  spawnPoints: THREE.Vector3[];
  zombieSpawnPoints: THREE.Vector3[];
  lootSpawnPoints: THREE.Vector3[];
  bossSpawnPoints: THREE.Vector3[];
  flagMesh?: THREE.Mesh;
}

/**
 * Generates procedural CanvasTextures for brick masonry, paver blocks, kota stone,
 * and grass turf so zero external 404 assets are ever fetched.
 */
function createBrickTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8b3226';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#6f241b';
  for (let row = 0; row < 16; row++) {
    const y = row * 16;
    ctx.fillRect(0, y, 256, 2);
    const offset = (row % 2) * 16;
    for (let col = 0; col < 8; col++) {
      const x = (col * 32 + offset) % 256;
      ctx.fillRect(x, y, 2, 16);
      if ((row + col) % 3 === 0) {
        ctx.fillStyle = '#9c3b2e';
        ctx.fillRect(x + 2, y + 2, 28, 12);
        ctx.fillStyle = '#6f241b';
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPaverTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#686b6e';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#4b4e52';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const shade = 98 + ((x + y) % 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 4})`;
      ctx.fillRect(x + 1, y + 1, 30, 30);
      ctx.strokeRect(x, y, 32, 32);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTurfTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#365829';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const x = (i * 73) % 256;
    const y = (i * 41) % 256;
    ctx.fillStyle = i % 2 === 0 ? '#3f6630' : '#2e4d23';
    ctx.fillRect(x, y, 3, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds the Iconic Grey Stone Circular Cutout Monument Wall (5.3m circular cutout ring
 * + horizontal concrete crossbar + terraced stone entrance steps) as documented in
 * Images 013, 022, 025, 034, 037, 046, 132, 133, 141 of CAMPUS_3D_ENVIRONMENT_VISUAL_ATLAS.pdf.
 */
function createCircularMonumentWall(
  stoneMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  darkKotaMat: THREE.Material
): THREE.Group {
  const monument = new THREE.Group();

  // Outer grey stone monument portal frame with circular ring cutout
  const shape = new THREE.Shape();
  const w = 5.2; // half-width -> 10.4m total width
  const h = 15.2;
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h);
  shape.lineTo(-w, h);
  shape.lineTo(-w, 0);

  // Lower entrance doorway cutout (center 4.4m wide, 4.2m tall)
  // And upper 5.3m diameter circular cutout ring centered at y = 10.2m
  const holeCircle = new THREE.Path();
  holeCircle.absarc(0, 10.2, 2.65, 0, Math.PI * 2, true);
  shape.holes.push(holeCircle);

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.1,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  const wallMesh = new THREE.Mesh(extrudeGeo, stoneMat);
  wallMesh.position.set(0, 0, -0.55);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  monument.add(wallMesh);

  // Horizontal white concrete crossbar across the circular cutout (Image 022, 132)
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.65, 1.35), whiteTrimMat);
  crossbar.position.set(0, 8.6, 0);
  crossbar.castShadow = true;
  monument.add(crossbar);

  // Inner circular ring rim accent
  const ringMesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.68, 0.16, 12, 32),
    whiteTrimMat
  );
  ringMesh.position.set(0, 10.2, 0.05);
  monument.add(ringMesh);

  // 4-tier grey stone entrance steps (Image 133)
  for (let s = 0; s < 4; s++) {
    const stepW = 7.2 - s * 0.4;
    const stepD = 2.2 - s * 0.45;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.16, stepD), darkKotaMat);
    stepMesh.position.set(0, 0.08 + s * 0.14, 1.1 - s * 0.2);
    stepMesh.receiveShadow = true;
    monument.add(stepMesh);
  }

  return monument;
}

/**
 * Builds a 4-story Enterable Academic Block matching Structures 3.1 (Block B Central),
 * 3.2 (Block A West), and 3.3 (Block C East) from the Campus 3D Visual Atlas PDF.
 */
function createAcademicBlock(
  name: string,
  centerX: number,
  centerZ: number,
  widthX: number,
  depthZ: number,
  brickMat: THREE.Material,
  whiteTrimMat: THREE.Material,
  stoneMat: THREE.Material,
  kotaFloorMat: THREE.Material,
  glassMat: THREE.Material,
  hasUndercroftTableTennis: boolean,
  hasClassroomFurniture: boolean,
  colliders: AABBBox[]
): THREE.Group {
  const block = new THREE.Group();
  block.name = name;
  block.position.set(centerX, 0, centerZ);

  const halfX = widthX / 2;
  const halfZ = depthZ / 2;
  const totalH = 14.0; // 4 stories (3.5m per story)

  // Ground floor kota stone slab
  const groundSlab = new THREE.Mesh(
    new THREE.BoxGeometry(widthX, 0.25, depthZ),
    kotaFloorMat
  );
  groundSlab.position.set(0, 0.125, 0);
  groundSlab.receiveShadow = true;
  block.add(groundSlab);

  // Upper floor gallery slabs with central open 4-story atrium lightwell (Images 110-115)
  const atriumW = widthX * 0.42;
  const atriumD = depthZ * 0.42;
  const wingThickX = (widthX - atriumW) / 2;
  const wingThickZ = (depthZ - atriumD) / 2;

  for (let floor = 1; floor <= 4; floor++) {
    const y = floor * 3.45;
    // North & South slab strips
    const nSlab = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.28, wingThickZ), whiteTrimMat);
    nSlab.position.set(0, y, -halfZ + wingThickZ / 2);
    block.add(nSlab);

    const sSlab = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.28, wingThickZ), whiteTrimMat);
    sSlab.position.set(0, y, halfZ - wingThickZ / 2);
    block.add(sSlab);

    // West & East slab strips framing the central lightwell
    const wSlab = new THREE.Mesh(new THREE.BoxGeometry(wingThickX, 0.28, atriumD), whiteTrimMat);
    wSlab.position.set(-halfX + wingThickX / 2, y, 0);
    block.add(wSlab);

    const eSlab = new THREE.Mesh(new THREE.BoxGeometry(wingThickX, 0.28, atriumD), whiteTrimMat);
    eSlab.position.set(halfX - wingThickX / 2, y, 0);
    block.add(eSlab);

    // Atrium black metal safety railings (Image 130)
    if (floor < 4) {
      const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
      const railN = new THREE.Mesh(new THREE.BoxGeometry(atriumW, 0.9, 0.08), railMat);
      railN.position.set(0, y + 0.55, -atriumD / 2);
      block.add(railN);
      const railS = new THREE.Mesh(new THREE.BoxGeometry(atriumW, 0.9, 0.08), railMat);
      railS.position.set(0, y + 0.55, atriumD / 2);
      block.add(railS);
    }
  }

  // Terracotta Brick Perimeter Walls (leaving Ground-Floor South & Side Portals open for player entry!)
  // Left & Right front facade wings
  const sideFacadeW = (widthX - 7.6) / 2;
  const frontLeftWall = new THREE.Mesh(
    new THREE.BoxGeometry(sideFacadeW, totalH, 0.8),
    brickMat
  );
  frontLeftWall.position.set(-halfX + sideFacadeW / 2, totalH / 2, halfZ - 0.4);
  frontLeftWall.castShadow = true;
  frontLeftWall.receiveShadow = true;
  block.add(frontLeftWall);

  const frontRightWall = new THREE.Mesh(
    new THREE.BoxGeometry(sideFacadeW, totalH, 0.8),
    brickMat
  );
  frontRightWall.position.set(halfX - sideFacadeW / 2, totalH / 2, halfZ - 0.4);
  frontRightWall.castShadow = true;
  frontRightWall.receiveShadow = true;
  block.add(frontRightWall);

  // Rear North Wall (with central doorway opening)
  const rearLeftWall = new THREE.Mesh(
    new THREE.BoxGeometry(sideFacadeW, totalH, 0.8),
    brickMat
  );
  rearLeftWall.position.set(-halfX + sideFacadeW / 2, totalH / 2, -halfZ + 0.4);
  rearLeftWall.castShadow = true;
  block.add(rearLeftWall);

  const rearRightWall = new THREE.Mesh(
    new THREE.BoxGeometry(sideFacadeW, totalH, 0.8),
    brickMat
  );
  rearRightWall.position.set(halfX - sideFacadeW / 2, totalH / 2, -halfZ + 0.4);
  rearRightWall.castShadow = true;
  block.add(rearRightWall);

  const rearUpperWall = new THREE.Mesh(
    new THREE.BoxGeometry(8.0, totalH - 4.0, 0.8),
    brickMat
  );
  rearUpperWall.position.set(0, 4.0 + (totalH - 4.0) / 2, -halfZ + 0.4);
  block.add(rearUpperWall);

  // West & East Side Walls (ground floor open portal in center, upper stories solid brick)
  const sideWingD = (depthZ - 5.6) / 2;
  const westFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, totalH, sideWingD), brickMat);
  westFront.position.set(-halfX + 0.4, totalH / 2, halfZ - sideWingD / 2);
  westFront.castShadow = true;
  block.add(westFront);

  const westRear = new THREE.Mesh(new THREE.BoxGeometry(0.8, totalH, sideWingD), brickMat);
  westRear.position.set(-halfX + 0.4, totalH / 2, -halfZ + sideWingD / 2);
  westRear.castShadow = true;
  block.add(westRear);

  const eastFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, totalH, sideWingD), brickMat);
  eastFront.position.set(halfX - 0.4, totalH / 2, halfZ - sideWingD / 2);
  eastFront.castShadow = true;
  block.add(eastFront);

  const eastRear = new THREE.Mesh(new THREE.BoxGeometry(0.8, totalH, sideWingD), brickMat);
  eastRear.position.set(halfX - 0.4, totalH / 2, -halfZ + sideWingD / 2);
  eastRear.castShadow = true;
  block.add(eastRear);

  // Register exact wall colliders so player can walk inside through the South, North, East & West portals!
  colliders.push(
    {
      minX: centerX - halfX,
      maxX: centerX - halfX + sideFacadeW,
      minZ: centerZ + halfZ - 1.0,
      maxZ: centerZ + halfZ + 0.4,
      label: `${name}_SouthLeft`,
    },
    {
      minX: centerX + halfX - sideFacadeW,
      maxX: centerX + halfX,
      minZ: centerZ + halfZ - 1.0,
      maxZ: centerZ + halfZ + 0.4,
      label: `${name}_SouthRight`,
    },
    {
      minX: centerX - halfX,
      maxX: centerX - halfX + sideFacadeW,
      minZ: centerZ - halfZ - 0.4,
      maxZ: centerZ - halfZ + 1.0,
      label: `${name}_NorthLeft`,
    },
    {
      minX: centerX + halfX - sideFacadeW,
      maxX: centerX + halfX,
      minZ: centerZ - halfZ - 0.4,
      maxZ: centerZ - halfZ + 1.0,
      label: `${name}_NorthRight`,
    },
    {
      minX: centerX - halfX - 0.4,
      maxX: centerX - halfX + 1.0,
      minZ: centerZ + halfZ - sideWingD,
      maxZ: centerZ + halfZ,
      label: `${name}_WestFront`,
    },
    {
      minX: centerX - halfX - 0.4,
      maxX: centerX - halfX + 1.0,
      minZ: centerZ - halfZ,
      maxZ: centerZ - halfZ + sideWingD,
      label: `${name}_WestRear`,
    },
    {
      minX: centerX + halfX - 1.0,
      maxX: centerX + halfX + 0.4,
      minZ: centerZ + halfZ - sideWingD,
      maxZ: centerZ + halfZ,
      label: `${name}_EastFront`,
    },
    {
      minX: centerX + halfX - 1.0,
      maxX: centerX + halfX + 0.4,
      minZ: centerZ - halfZ,
      maxZ: centerZ - halfZ + sideWingD,
      label: `${name}_EastRear`,
    }
  );

  // White Concrete Structural Ladder Columns & Window Bays (Image 134 & 135)
  const colPositionsX = [-halfX + 2.4, -halfX + 6.4, halfX - 6.4, halfX - 2.4];
  colPositionsX.forEach((cx) => {
    const ladderCol = new THREE.Mesh(new THREE.BoxGeometry(0.48, totalH + 0.5, 1.15), whiteTrimMat);
    ladderCol.position.set(cx, totalH / 2, halfZ);
    block.add(ladderCol);

    const rearCol = new THREE.Mesh(new THREE.BoxGeometry(0.48, totalH + 0.5, 1.15), whiteTrimMat);
    rearCol.position.set(cx, totalH / 2, -halfZ);
    block.add(rearCol);

    for (let fl = 1; fl <= 4; fl++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 0.92), glassMat);
      win.position.set(cx, fl * 3.3 - 1.2, halfZ - 0.35);
      block.add(win);
    }
  });

  // Iconic South Circular Cutout Stone Monument Wall (Images 013, 022, 025, 037, 132)
  const monument = createCircularMonumentWall(stoneMat, whiteTrimMat, kotaFloorMat);
  monument.position.set(0, 0, halfZ + 0.35);
  block.add(monument);

  // 4 Structural Atrium Pillars inside the undercroft
  const pillarOffsets = [
    [-atriumW / 2, -atriumD / 2],
    [atriumW / 2, -atriumD / 2],
    [-atriumW / 2, atriumD / 2],
    [atriumW / 2, atriumD / 2],
  ];
  pillarOffsets.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.75, totalH, 0.75), whiteTrimMat);
    pillar.position.set(px, totalH / 2, pz);
    pillar.castShadow = true;
    block.add(pillar);
  });

  // Walkable Staircase Flight on East internal gallery (Images 128-129)
  for (let step = 0; step < 10; step++) {
    const stairStep = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.32, 0.45), stoneMat);
    stairStep.position.set(atriumW / 2 + 1.4, 0.2 + step * 0.34, -2.2 + step * 0.45);
    block.add(stairStep);
  }

  // Block B Central Ground-Floor Table-Tennis Undercroft Prop (Images 078, 079, 080)
  if (hasUndercroftTableTennis) {
    const ttGroup = new THREE.Group();
    const ttTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 0.08, 1.525),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.1 })
    );
    ttTop.position.y = 0.76;
    ttTop.castShadow = true;
    ttGroup.add(ttTop);

    const ttNet = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.16, 1.62),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 })
    );
    ttNet.position.y = 0.86;
    ttGroup.add(ttNet);

    [
      [-1.1, -0.6],
      [1.1, -0.6],
      [-1.1, 0.6],
      [1.1, 0.6],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), stoneMat);
      leg.position.set(lx, 0.38, lz);
      ttGroup.add(leg);
    });
    ttGroup.position.set(0, 0.22, 0);
    block.add(ttGroup);
  }

  // Block A / C Enterable Lecture Classroom Furniture (Desks, Podium, Green Chalkboard - Images 104-109)
  if (hasClassroomFurniture) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 });
    const chalkboardMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5 });

    const chalkboard = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.5, 0.12), chalkboardMat);
    chalkboard.position.set(0, 1.9, -halfZ + 0.95);
    block.add(chalkboard);

    const podium = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.7), woodMat);
    podium.position.set(1.6, 0.7, -halfZ + 2.1);
    block.add(podium);

    for (let row = 0; row < 3; row++) {
      for (let col = -1; col <= 1; col += 2) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 0.65), woodMat);
        desk.position.set(col * 2.1, 0.5, -2.5 + row * 2.1);
        desk.castShadow = true;
        block.add(desk);
      }
    }
  }

  return block;
}

export function buildCampusEnvironment(maxAnisotropy: number = 4): CampusBuildResult {
  const group = new THREE.Group();
  group.name = 'CAMPUS_SURVIVAL_MAP_3D_GLB';

  const colliders: AABBBox[] = [];
  const brickTex = createBrickTexture(maxAnisotropy);
  const paverTex = createPaverTexture(maxAnisotropy);
  const turfTex = createTurfTexture(maxAnisotropy);

  const turfMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: turfTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const paverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: paverTex,
    roughness: 0.8,
    metalness: 0.08,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: brickTex,
    roughness: 0.78,
    metalness: 0.06,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.72,
    metalness: 0.15,
  });
  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.1,
  });
  const kotaFloorMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    roughness: 0.15,
    metalness: 0.8,
  });

  // ============================================================================
  // 01_Terrain_Roads_And_Gate ([-90..+90, -80..+74])
  // ============================================================================
  const terrainNode = new THREE.Group();
  terrainNode.name = '01_Terrain_Roads_And_Gate';

  // Extended natural ground plane (360m x 360m) so horizon blends into fog seamlessly
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), turfMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  terrainNode.add(groundMesh);

  // Interlocking Paver Roads (offset y >= 0.02 to prevent Z-fighting)
  const addRoadStrip = (cx: number, cz: number, w: number, d: number) => {
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), paverMat);
    road.position.set(cx, 0.03, cz);
    road.receiveShadow = true;
    terrainNode.add(road);

    // Striped yellow-and-black curb stones (Image 009, 139)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
    const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, d), curbMat);
    curbL.position.set(cx - w / 2, 0.07, cz);
    terrainNode.add(curbL);
    const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, d), curbMat);
    curbR.position.set(cx + w / 2, 0.07, cz);
    terrainNode.add(curbR);
  };

  // Main South-to-North Paver Avenue (Gatehouse Z=72 to Central Quad Z=-18)
  addRoadStrip(0, 27, 11.5, 92);
  // Central Quadrangle Driveway Loop (Z = 18, X = -44 to +48)
  addRoadStrip(2, 18, 94, 8.5);
  // East Internal Paver Avenue (X = +48, Z = -52 to +60)
  addRoadStrip(48, 4, 8.5, 112);
  // West Sports Access Road (X = -18, Z = -46 to +56)
  addRoadStrip(-18, 5, 7.5, 102);
  // North Service Road (Z = -52, X = -46 to +48)
  addRoadStrip(1, -52, 94, 7.5);

  // Structure 3.5: Main Entrance Gatehouse, Canopy Truss & Wrought-Iron Gates at (0, 0, +70)
  const gatehouse = new THREE.Group();
  gatehouse.name = 'Structure_3_5_Main_Gatehouse';
  gatehouse.position.set(0, 0, 70);

  const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.2, 2.6), stoneMat);
  pillarLeft.position.set(-7.2, 3.1, 0);
  pillarLeft.castShadow = true;
  gatehouse.add(pillarLeft);

  const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(2.6, 6.2, 2.6), stoneMat);
  pillarRight.position.set(7.2, 3.1, 0);
  pillarRight.castShadow = true;
  gatehouse.add(pillarRight);

  const guardBooth = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.6, 3.8), brickMat);
  guardBooth.position.set(-10.5, 1.8, 0);
  guardBooth.castShadow = true;
  gatehouse.add(guardBooth);

  const canopyTruss = new THREE.Mesh(new THREE.BoxGeometry(21.0, 0.85, 4.4), whiteTrimMat);
  canopyTruss.position.set(0, 6.3, 0);
  canopyTruss.castShadow = true;
  gatehouse.add(canopyTruss);

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(12.4, 1.25, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    })
  );
  signBoard.position.set(0, 5.4, -2.1);
  gatehouse.add(signBoard);

  terrainNode.add(gatehouse);
  colliders.push(
    { minX: -13, maxX: -5.8, minZ: 68.2, maxZ: 71.8, label: 'Gatehouse_West' },
    { minX: 5.8, maxX: 9.0, minZ: 68.2, maxZ: 71.8, label: 'Gatehouse_East' }
  );

  // Perimeter low brick boundary wall at [±88, -78..+72]
  const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(176, 2.5, 0.7), brickMat);
  wallNorth.position.set(0, 1.25, -78);
  terrainNode.add(wallNorth);
  const wallEast = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 150), brickMat);
  wallEast.position.set(88, 1.25, -3);
  terrainNode.add(wallEast);
  const wallWest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 150), brickMat);
  wallWest.position.set(-88, 1.25, -3);
  terrainNode.add(wallWest);

  group.add(terrainNode);

  // ============================================================================
  // 02_Academic_Block_B_Central ([-14..+14, -43..-21]) + Skybridges
  // ============================================================================
  const blockB = createAcademicBlock(
    '02_Academic_Block_B_Central',
    0,
    -32,
    28,
    22,
    brickMat,
    whiteTrimMat,
    stoneMat,
    kotaFloorMat,
    glassMat,
    true, // Undercroft Table-Tennis court
    false,
    colliders
  );

  // Elevated Third-Floor Walkable Skybridges at y = 7.0m (Image 010, 131)
  const skybridgeWest = new THREE.Group();
  const sbFloorW = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 3.2), whiteTrimMat);
  sbFloorW.position.set(-17.5, 7.0, -17.0);
  sbFloorW.castShadow = true;
  skybridgeWest.add(sbFloorW);
  const sbRailW1 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.12), stoneMat);
  sbRailW1.position.set(-17.5, 7.65, -15.45);
  skybridgeWest.add(sbRailW1);
  const sbRailW2 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.12), stoneMat);
  sbRailW2.position.set(-17.5, 7.65, -18.55);
  skybridgeWest.add(sbRailW2);
  group.add(skybridgeWest);

  const skybridgeEast = new THREE.Group();
  const sbFloorE = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 3.2), whiteTrimMat);
  sbFloorE.position.set(17.5, 7.0, -17.0);
  sbFloorE.castShadow = true;
  skybridgeEast.add(sbFloorE);
  const sbRailE1 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.12), stoneMat);
  sbRailE1.position.set(17.5, 7.65, -15.45);
  skybridgeEast.add(sbRailE1);
  const sbRailE2 = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.1, 0.12), stoneMat);
  sbRailE2.position.set(17.5, 7.65, -18.55);
  skybridgeEast.add(sbRailE2);
  group.add(skybridgeEast);

  group.add(blockB);

  // ============================================================================
  // 03_Academic_Block_A_West ([-44..-20, -23..-1])
  // ============================================================================
  const blockA = createAcademicBlock(
    '03_Academic_Block_A_West',
    -32,
    -12,
    24,
    22,
    brickMat,
    whiteTrimMat,
    stoneMat,
    kotaFloorMat,
    glassMat,
    false,
    true, // Enterable Lecture Classroom with desks/podium/chalkboard
    colliders
  );
  group.add(blockA);

  // ============================================================================
  // 04_Academic_Block_C_East ([+14..+38, -24..-4])
  // ============================================================================
  const blockC = createAcademicBlock(
    '04_Academic_Block_C_East',
    26,
    -14,
    24,
    20,
    brickMat,
    whiteTrimMat,
    stoneMat,
    kotaFloorMat,
    glassMat,
    false,
    true,
    colliders
  );
  group.add(blockC);

  // ============================================================================
  // 05_Basement_Garage_And_Sports ([+15..+41, -51..-24])
  // ============================================================================
  const basementNode = new THREE.Group();
  basementNode.name = '05_Basement_Garage_And_Sports';

  // Sloped Basement Ramp & Red/Yellow Striped Median Divider (Images 094, 097, 138)
  const rampFloor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 14.0), kotaFloorMat);
  rampFloor.position.set(20.5, -0.4, -31.0);
  rampFloor.rotation.x = 0.08;
  basementNode.add(rampFloor);

  const stripedDivider = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 1.1, 13.5),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
  );
  stripedDivider.position.set(20.5, 0.55, -31.0);
  basementNode.add(stripedDivider);

  // Basement Parking Pavilion & Pillared Indoor Sports Hall at (+28, 0, -40)
  const sportsHallFloor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 22), kotaFloorMat);
  sportsHallFloor.position.set(28, 0.15, -40);
  sportsHallFloor.receiveShadow = true;
  basementNode.add(sportsHallFloor);

  const sportsHallRoof = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.6, 22.6), whiteTrimMat);
  sportsHallRoof.position.set(28, 6.2, -40);
  sportsHallRoof.castShadow = true;
  basementNode.add(sportsHallRoof);

  // Hazard-striped concrete pillars inside Garage/Sports Hall (Images 084, 094, 116)
  for (let px = 18; px <= 38; px += 10) {
    for (let pz = -49; pz <= -31; pz += 9) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.2, 0.85), stoneMat);
      col.position.set(px, 3.1, pz);
      col.castShadow = true;
      basementNode.add(col);

      const hazardBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.1, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
      );
      hazardBand.position.set(px, 1.1, pz);
      basementNode.add(hazardBand);

      colliders.push({
        minX: px - 0.55,
        maxX: px + 0.55,
        minZ: pz - 0.55,
        maxZ: pz + 0.55,
        label: 'Basement_Column',
      });
    }
  }
  group.add(basementNode);

  // ============================================================================
  // 06_Cafeteria_FoodCourt_Kiosk ([+11..+40, +10..+37])
  // ============================================================================
  const cafeNode = new THREE.Group();
  cafeNode.name = '06_Cafeteria_FoodCourt_Kiosk';

  // Vibrant Blue 'Chai Life' Kiosk Booth at (13.5, 0, 20.5) (Images 051, 053, 058)
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(13.5, 0, 20.5);
  const kioskBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.8, 3.0),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.15 })
  );
  kioskBody.position.y = 1.4;
  kioskBody.castShadow = true;
  kioskGroup.add(kioskBody);

  const kioskRoof = new THREE.Mesh(
    new THREE.ConeGeometry(2.8, 1.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 })
  );
  kioskRoof.position.y = 3.35;
  kioskRoof.rotation.y = Math.PI / 4;
  kioskGroup.add(kioskRoof);

  // Dual blue cylindrical trash bins next to kiosk (Image 058)
  [-2.3, -3.1].forEach((bx) => {
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.28, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
    );
    bin.position.set(bx, 0.42, 0.8);
    kioskGroup.add(bin);
  });
  cafeNode.add(kioskGroup);
  colliders.push({ minX: 11.6, maxX: 15.4, minZ: 18.8, maxZ: 22.2, label: 'Chai_Life_Kiosk' });

  // Brick Indoor Food Court & Covered Bamboo-Screened Patio at (26, 0, 24) (Images 048-059, 117-121)
  const foodCourtFloor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 22), kotaFloorMat);
  foodCourtFloor.position.set(26, 0.125, 24);
  foodCourtFloor.receiveShadow = true;
  cafeNode.add(foodCourtFloor);

  // Brick back & side walls of Food Court (leaving wide front & patio open to enter)
  const fcNorthWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 0.7), brickMat);
  fcNorthWall.position.set(22, 2.6, 13.5);
  fcNorthWall.castShadow = true;
  cafeNode.add(fcNorthWall);

  const fcSouthWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 0.7), brickMat);
  fcSouthWall.position.set(22, 2.6, 34.5);
  fcSouthWall.castShadow = true;
  cafeNode.add(fcSouthWall);

  const fcRoof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 22), whiteTrimMat);
  fcRoof.position.set(22, 5.3, 24);
  fcRoof.castShadow = true;
  cafeNode.add(fcRoof);

  // Covered Outdoor Patio canopy on the East side (x = 34.5, z = 24)
  const patioCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 0.28, 21),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  patioCanopy.position.set(34.5, 4.2, 24);
  patioCanopy.castShadow = true;
  cafeNode.add(patioCanopy);

  // Dining tables inside Food Court & Patio
  const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
  for (let tz = 17; tz <= 31; tz += 4.5) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.2), tableWoodMat);
    table.position.set(23, 0.55, tz);
    cafeNode.add(table);

    const patioTable = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.1), tableWoodMat);
    patioTable.position.set(34, 0.55, tz);
    cafeNode.add(patioTable);
  }

  colliders.push(
    { minX: 14, maxX: 30, minZ: 12.9, maxZ: 14.1, label: 'FoodCourt_NorthWall' },
    { minX: 14, maxX: 30, minZ: 33.9, maxZ: 35.1, label: 'FoodCourt_SouthWall' }
  );
  group.add(cafeNode);

  // ============================================================================
  // 07_Sports_Amphitheater_Tower ([-78..-20, -56..+56])
  // ============================================================================
  const sportsNode = new THREE.Group();
  sportsNode.name = '07_Sports_Amphitheater_Tower';

  // 20m Dirt Cricket Pitch & Wooden Stumps at (-56, 0, 18) (Images 072-076)
  const clayMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.88 });
  const cricketPitch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 20.2), clayMat);
  cricketPitch.position.set(-56, 0.03, 18);
  cricketPitch.receiveShadow = true;
  sportsNode.add(cricketPitch);

  // Wooden cricket wickets/stumps at both ends of pitch
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
  [9.0, 27.0].forEach((sz) => {
    for (let s = -1; s <= 1; s++) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), stumpMat);
      stump.position.set(-56 + s * 0.12, 0.38, sz);
      sportsNode.add(stump);
    }
  });

  // White Cricket Outfield Boundary Ring (Image 072, 076)
  const boundaryRing = new THREE.Mesh(
    new THREE.RingGeometry(24.5, 25.0, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  boundaryRing.rotation.x = -Math.PI / 2;
  boundaryRing.position.set(-56, 0.04, 18);
  sportsNode.add(boundaryRing);

  // White Football Goalposts at North & South ends of field (Image 074)
  [-4, 40].forEach((gz) => {
    const goalGroup = new THREE.Group();
    goalGroup.position.set(-56, 0, gz);
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), whiteTrimMat);
    postL.position.set(-3.2, 1.2, 0);
    goalGroup.add(postL);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), whiteTrimMat);
    postR.position.set(3.2, 1.2, 0);
    goalGroup.add(postR);
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.5, 8), whiteTrimMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.4, 0);
    goalGroup.add(crossbar);
    sportsNode.add(goalGroup);
  });

  // 9-Tier Stepped Stone Amphitheater at (-28, 0, 32) overlooking Sports Ground (Images 082, 083, 144)
  const amphiGroup = new THREE.Group();
  amphiGroup.position.set(-28, 0, 32);
  for (let tier = 0; tier < 9; tier++) {
    const stepH = (tier + 1) * 0.36;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, stepH, 22.0), stoneMat);
    stepMesh.position.set(tier * 0.95, stepH / 2, 0);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    amphiGroup.add(stepMesh);

    const whiteEdge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 22.02), whiteTrimMat);
    whiteEdge.position.set(tier * 0.95 - 0.42, stepH + 0.02, 0);
    amphiGroup.add(whiteEdge);
  }
  // Colorful flags along upper rim of Amphitheater (Image 082)
  const flagColors = [0xef4444, 0x3b82f6, 0xeab308, 0x10b981, 0xa855f7];
  for (let f = 0; f < 5; f++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), whiteTrimMat);
    pole.position.set(8.2, 4.5, -8 + f * 4);
    amphiGroup.add(pole);
    const pennant = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.45, 0.04),
      new THREE.MeshStandardMaterial({ color: flagColors[f], roughness: 0.4 })
    );
    pennant.position.set(8.6, 5.5, -8 + f * 4);
    amphiGroup.add(pennant);
  }
  sportsNode.add(amphiGroup);
  colliders.push({ minX: -28.5, maxX: -19.5, minZ: 21, maxZ: 43, label: 'Stone_Amphitheater' });

  // Iconic 23.4m Tall Mushroom-Shaped Concrete Water Tower at (-72, 0, -56) (Images 077, 137)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(-72, 0, -56);
  const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 1.4, 16), stoneMat);
  towerBase.position.y = 0.7;
  towerGroup.add(towerBase);

  const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 16.5, 16), whiteTrimMat);
  towerShaft.position.y = 9.2;
  towerShaft.castShadow = true;
  towerGroup.add(towerShaft);

  const towerCone = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 2.1, 4.2, 20), stoneMat);
  towerCone.position.y = 19.2;
  towerCone.castShadow = true;
  towerGroup.add(towerCone);

  const towerDome = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 6.8, 2.2, 20), whiteTrimMat);
  towerDome.position.y = 22.3;
  towerGroup.add(towerDome);

  sportsNode.add(towerGroup);
  colliders.push({ minX: -75.2, maxX: -68.8, minZ: -59.2, maxZ: -52.8, label: 'Water_Tower' });

  group.add(sportsNode);

  // ============================================================================
  // 08_Quadrangle_Badminton ([-2..+20, -17..+1])
  // ============================================================================
  const quadNode = new THREE.Group();
  quadNode.name = '08_Quadrangle_Badminton';

  // Central Flagpole Plaza at (0, 0, -8) (Images 001, 005, 141)
  const flagPlinth1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.35, 24), stoneMat);
  flagPlinth1.position.set(0, 0.175, -8);
  quadNode.add(flagPlinth1);
  const flagPlinth2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 0.45, 24), whiteTrimMat);
  flagPlinth2.position.set(0, 0.55, -8);
  quadNode.add(flagPlinth2);

  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 14.5, 12), whiteTrimMat);
  flagpole.position.set(0, 7.5, -8);
  flagpole.castShadow = true;
  quadNode.add(flagpole);

  const flagMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.5, 8, 4),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x9a3412,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.5,
    })
  );
  flagMesh.position.set(1.35, 13.8, -8);
  quadNode.add(flagMesh);

  colliders.push({ minX: -2.2, maxX: 2.2, minZ: -10.2, maxZ: -5.8, label: 'Flagpole_Plinth' });

  // Outdoor Paved Badminton Court at (13.5, 0, -8) (Image 081)
  const badmintonCourt = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 0.06, 13.4),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
  );
  badmintonCourt.position.set(13.5, 0.03, -8);
  quadNode.add(badmintonCourt);

  const badmintonNet = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 0.76, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  badmintonNet.position.set(13.5, 1.15, -8);
  quadNode.add(badmintonNet);

  group.add(quadNode);

  // ============================================================================
  // 09_Vehicles_And_Landscaping ([-81..+59, -65..+62])
  // ============================================================================
  const landscapeNode = new THREE.Group();
  landscapeNode.name = '09_Vehicles_And_Landscaping';

  // 30 Shade Trees using InstancedMesh (composite trunk + canopy InstancedMeshes)
  const treeCoords: [number, number][] = [
    [-12, 60], [12, 60], [-12, 46], [12, 46], [-12, 32], [12, 32],
    [54, 48], [54, 32], [54, 16], [54, 0], [54, -16], [54, -32], [54, -48],
    [-48, 56], [-64, 56], [-78, 42], [-78, 22], [-78, 2], [-78, -18], [-78, -38],
    [-60, -58], [-42, -58], [-24, -58], [0, -58], [24, -58], [44, -58],
    [-8, 6], [8, 6], [-22, 6], [22, 6],
  ];

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const canopyGeo = new THREE.DodecahedronGeometry(2.6, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.85 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCoords.length);
  trunkInst.castShadow = true;
  canopyInst.castShadow = true;

  const dummy = new THREE.Object3D();
  treeCoords.forEach(([tx, tz], idx) => {
    const scale = 0.88 + (idx % 4) * 0.08;
    dummy.position.set(tx, 1.6 * scale, tz);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tx, 4.4 * scale, tz);
    dummy.scale.set(scale * 1.1, scale * 0.95, scale * 1.1);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(idx, dummy.matrix);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  landscapeNode.add(trunkInst);
  landscapeNode.add(canopyInst);

  // 4 Parked Avenue SUVs/Cars (Composite multi-part vehicles)
  const carPositions: [number, number, number, number][] = [
    [45.5, 12, 0, 0x334155],
    [45.5, -6, 0, 0x475569],
    [-8.5, 42, 0.15, 0x1e293b],
    [18.5, 18.2, Math.PI / 2, 0x3f3f46],
  ];
  carPositions.forEach(([cx, cz, rotY, colorHex]) => {
    const car = new THREE.Group();
    car.position.set(cx, 0, cz);
    car.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.6 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 4.4), bodyMat);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    car.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 2.3), glassMat);
    cabin.position.set(0, 1.38, -0.2);
    car.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    [
      [-1.02, 0.36, 1.35],
      [1.02, 0.36, 1.35],
      [-1.02, 0.36, -1.35],
      [1.02, 0.36, -1.35],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      car.add(wheel);
    });

    landscapeNode.add(car);
    colliders.push({
      minX: cx - 1.6,
      maxX: cx + 1.6,
      minZ: cz - 2.3,
      maxZ: cz + 2.3,
      label: 'Parked_SUV',
    });
  });

  // Row of parked two-wheelers along Quadrangle Driveway (Image 139)
  const bikeGeo = new THREE.BoxGeometry(0.55, 0.95, 1.65);
  const bikeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
  const bikeInst = new THREE.InstancedMesh(bikeGeo, bikeMat, 16);
  for (let i = 0; i < 16; i++) {
    dummy.position.set(-38 + i * 1.35, 0.5, 15.2);
    dummy.rotation.set(0, 0.25, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bikeInst.setMatrixAt(i, dummy.matrix);
  }
  bikeInst.instanceMatrix.needsUpdate = true;
  bikeInst.computeBoundingSphere();
  landscapeNode.add(bikeInst);

  group.add(landscapeNode);

  // ============================================================================
  // Technical Gameplay Spawn & Waypoint Coordinates (Invisible Systems)
  // ============================================================================
  const spawnPoints = [
    new THREE.Vector3(0, 0, 38), // Main Avenue looking north at Flagpole & Block B
    new THREE.Vector3(-4, 0, 8), // Central Quadrangle
    new THREE.Vector3(6, 0, 8),
    new THREE.Vector3(0, 0, 22),
  ];

  const zombieSpawnPoints = [
    new THREE.Vector3(-28, 0, -4), // Near Block A West entrance
    new THREE.Vector3(24, 0, -2), // Near Block C East entrance
    new THREE.Vector3(0, 0, -26), // Inside Block B Central Undercroft
    new THREE.Vector3(-48, 0, 18), // Sports Cricket Ground
    new THREE.Vector3(24, 0, 22), // Cafeteria & Chai Kiosk
    new THREE.Vector3(22, 0, -34), // Basement Ramp
    new THREE.Vector3(-22, 0, 32), // Stone Amphitheater
    new THREE.Vector3(44, 0, 2), // East Paver Avenue
    new THREE.Vector3(-16, 0, -44), // North Service Loop
    new THREE.Vector3(16, 0, 48), // South Main Avenue
  ];

  const lootSpawnPoints = [
    new THREE.Vector3(0, 0, 12), // Central Quad South
    new THREE.Vector3(-5, 0, -14), // Flagpole Plaza NW
    new THREE.Vector3(13.5, 0, -8), // Badminton Court
    new THREE.Vector3(0, 0, -31), // Block B Table-Tennis Undercroft
    new THREE.Vector3(-32, 0, -12), // Block A Classroom Atrium
    new THREE.Vector3(26, 0, -14), // Block C Atrium
    new THREE.Vector3(16, 0, 20), // Near Blue Chai Life Kiosk
    new THREE.Vector3(-38, 0, 26), // Sports Field & Amphitheater
    new THREE.Vector3(24, 0, -36), // Basement Garage Ramp
    new THREE.Vector3(0, 0, 52), // Main Gate Avenue
  ];

  const bossSpawnPoints = [
    new THREE.Vector3(0, 0, -18), // Central Quadrangle in front of Block B Monument (matching Videos 1 & 2!)
    new THREE.Vector3(-46, 0, 18), // Sports Ground Arena
    new THREE.Vector3(26, 0, -36), // Basement Arena
  ];

  return {
    group,
    colliders,
    spawnPoints,
    zombieSpawnPoints,
    lootSpawnPoints,
    bossSpawnPoints,
    flagMesh,
  };
}
