import * as THREE from 'three';
import {
  AABB2D,
  WallCollider3D,
  StairRampCollider,
  FloorSlabCollider,
} from './rules';

export interface CampusBuildResult {
  rootGroup: THREE.Group;
  colliders: AABB2D[];
  walls3D: WallCollider3D[];
  stairs: StairRampCollider[];
  floors: FloorSlabCollider[];
  animatedProps: {
    flagMesh?: THREE.Mesh;
    beaconLights: THREE.PointLight[];
    crateMeshes: THREE.Object3D[];
  };
  spawnPoints: Array<{ x: number; z: number }>;
  pickupLocations: Array<{ x: number; y?: number; z: number }>;
}

/**
 * Builds the complete 180m x 160m Campus 3D Environment Visual Atlas with:
 * - Enterable hollow buildings with doorway openings on every block
 * - Segmented 3D Wall Colliders (walls act as solid walls; doorways let you walk inside)
 * - Walkable 3D Staircases & Ramps with visible steps and handrails connecting Ground (0m), 2nd Floor (4.2m), 3rd Floor & Skybridges (8.4m), and Basement (-3.6m)
 */
export function buildCampusEnvironment(scene: THREE.Scene): CampusBuildResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'CAMPUS_3D_ENVIRONMENT_VISUAL_ATLAS_ROOT';

  const colliders: AABB2D[] = [];
  const walls3D: WallCollider3D[] = [];
  const stairs: StairRampCollider[] = [];
  const floors: FloorSlabCollider[] = [];
  const beaconLights: THREE.PointLight[] = [];
  const crateMeshes: THREE.Object3D[] = [];

  // Shared PBR Materials matching the 32-page Campus 3D Visual Atlas PDF
  const matTurf = new THREE.MeshStandardMaterial({ color: 0x3f6a34, roughness: 0.92, metalness: 0.02 });
  const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.85, metalness: 0.08 });
  const matConcreteLight = new THREE.MeshStandardMaterial({ color: 0xd6d3cd, roughness: 0.72, metalness: 0.06 });
  const matConcreteWarm = new THREE.MeshStandardMaterial({ color: 0xc7bfb3, roughness: 0.78, metalness: 0.05 });
  const matFloorTile = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.1 });
  const matBrickTerra = new THREE.MeshStandardMaterial({ color: 0x9b4d3a, roughness: 0.8, metalness: 0.05 });
  const matWindowGlass = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.65,
    transparent: true,
    opacity: 0.45,
  });
  const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 });
  const matYellowSafety = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, metalness: 0.2 });
  const matChaiBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.25 });
  const matBadmintonGreen = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65, metalness: 0.05 });
  const matClayPitch = new THREE.MeshStandardMaterial({ color: 0xb48258, roughness: 0.88, metalness: 0.02 });
  const matStairStep = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.35 });
  const matStairRail = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
  });

  // Helper: Add a solid 3D wall segment that both renders and blocks actors on its floor
  const addWallSegment = (
    parent: THREE.Group,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    minY: number,
    maxY: number,
    mat: THREE.Material,
    label?: string
  ) => {
    const w = maxX - minX;
    const h = maxY - minY;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    walls3D.push({ minX, maxX, minZ, maxZ, minY, maxY, label });
    if (minY <= 0.5 && maxY >= 1.5) {
      colliders.push({ minX, maxX, minZ, maxZ, label });
    }
  };

  // Helper: Add a walkable Floor Slab
  const addFloorSlab = (
    parent: THREE.Group,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    elevationY: number,
    thickness: number,
    mat: THREE.Material,
    id: string
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
    mesh.position.set((minX + maxX) / 2, elevationY - thickness / 2, (minZ + maxZ) / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    parent.add(mesh);

    floors.push({ id, minX, maxX, minZ, maxZ, elevationY });
  };

  // Helper: Build a visible 3D Staircase with individual steps, side stringers, glowing handrails, and StairRampCollider
  const addWalkableStaircase = (
    parent: THREE.Group,
    spec: StairRampCollider,
    stepCount = 14
  ) => {
    stairs.push(spec);
    const stairGroup = new THREE.Group();
    const totalW = spec.maxX - spec.minX;
    const totalD = spec.maxZ - spec.minZ;
    const deltaY = spec.endY - spec.startY;

    for (let i = 0; i < stepCount; i++) {
      const t0 = i / stepCount;
      const t1 = (i + 1) / stepCount;
      const tMid = (t0 + t1) / 2;
      const stepY = spec.startY + t1 * deltaY;
      const stepH = Math.max(0.18, Math.abs(deltaY) / stepCount + 0.08);

      if (spec.axis === 'z') {
        const zPos = spec.startCoord + tMid * (spec.endCoord - spec.startCoord);
        const stepDepth = Math.abs(spec.endCoord - spec.startCoord) / stepCount + 0.05;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(totalW, stepH, stepDepth),
          i % 2 === 0 ? matStairStep : matConcreteLight
        );
        stepMesh.position.set((spec.minX + spec.maxX) / 2, stepY - stepH / 2, zPos);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        stairGroup.add(stepMesh);
      } else {
        const xPos = spec.startCoord + tMid * (spec.endCoord - spec.startCoord);
        const stepWidth = Math.abs(spec.endCoord - spec.startCoord) / stepCount + 0.05;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(stepWidth, stepH, totalD),
          i % 2 === 0 ? matStairStep : matConcreteLight
        );
        stepMesh.position.set(xPos, stepY - stepH / 2, (spec.minZ + spec.maxZ) / 2);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        stairGroup.add(stepMesh);
      }
    }

    // Glowing tactical handrails on both sides of the staircase so players easily spot every stair
    const railLen = spec.axis === 'z' ? totalD : totalW;
    const slopeAngle = Math.atan2(deltaY, spec.endCoord - spec.startCoord);
    const midY = (spec.startY + spec.endY) / 2 + 0.85;

    if (spec.axis === 'z') {
      for (const railX of [spec.minX + 0.08, spec.maxX - 0.08]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Math.hypot(railLen, deltaY)), matStairRail);
        rail.position.set(railX, midY, (spec.minZ + spec.maxZ) / 2);
        rail.rotation.x = -slopeAngle;
        stairGroup.add(rail);
      }
    } else {
      for (const railZ of [spec.minZ + 0.08, spec.maxZ - 0.08]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(railLen, deltaY), 0.08, 0.08), matStairRail);
        rail.position.set((spec.minX + spec.maxX) / 2, midY, railZ);
        rail.rotation.z = slopeAngle;
        stairGroup.add(rail);
      }
    }

    parent.add(stairGroup);
  };

  // ==========================================================================
  // 01_Terrain_Roads_And_Gate
  // ==========================================================================
  const node01 = new THREE.Group();
  node01.name = '01_Terrain_Roads_And_Gate';

  // Ground plane with cutout over the Basement Garage pit (-48..-24, 32..50) so player can descend below Y=0
  const groundMain = new THREE.Mesh(new THREE.PlaneGeometry(190, 170), matTurf);
  groundMain.rotation.x = -Math.PI / 2;
  groundMain.position.y = -0.05;
  groundMain.receiveShadow = true;
  node01.add(groundMain);

  const addRoadStrip = (x: number, z: number, w: number, d: number) => {
    const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), matAsphalt);
    road.position.set(x, 0.02, z);
    road.receiveShadow = true;
    node01.add(road);
  };
  addRoadStrip(0, 62, 168, 8.5);
  addRoadStrip(-74, -4, 8.5, 136);
  addRoadStrip(74, -4, 8.5, 136);
  addRoadStrip(0, -40, 152, 7.0);
  addRoadStrip(0, 22, 60, 8.0);

  // Main South Gate Arch (Walkable underneath!)
  addWallSegment(node01, -9.5, -7.5, 67, 69, 0, 6.2, matConcreteLight, 'Gate West Pillar');
  addWallSegment(node01, 7.5, 9.5, 67, 69, 0, 6.2, matConcreteLight, 'Gate East Pillar');
  const gateCanopy = new THREE.Mesh(new THREE.BoxGeometry(22, 1.3, 4.2), matBrickTerra);
  gateCanopy.position.set(0, 6.2, 68);
  node01.add(gateCanopy);

  // Enterable South Gate Guard Booth (doorway on East face)
  addWallSegment(node01, -16.5, -11.5, 63.5, 64.0, 0, 3.2, matConcreteWarm, 'Guard Booth North');
  addWallSegment(node01, -16.5, -11.5, 67.5, 68.0, 0, 3.2, matConcreteWarm, 'Guard Booth South');
  addWallSegment(node01, -16.5, -16.0, 64.0, 67.5, 0, 3.2, matConcreteWarm, 'Guard Booth West');
  addFloorSlab(node01, -16.6, -11.4, 63.4, 68.1, 3.2, 0.3, matDarkSteel, 'guard_booth_roof');

  rootGroup.add(node01);

  // ==========================================================================
  // 02_Academic_Block_B_Central (Enterable 3-Story Central Hub + Monument Arch + Staircases + Skybridges)
  // ==========================================================================
  const node02 = new THREE.Group();
  node02.name = '02_Academic_Block_B_Central';

  // Ground Floor tile slab (X: -24..+24, Z: -34..-10)
  addFloorSlab(node02, -24, 24, -34, -10, 0.05, 0.1, matFloorTile, 'block_b_ground');

  // 2nd Floor Slab (Y = 4.2m) with central atrium/stairwell cutout (X: -6..+6, Z: -26..-14 is open for stairs)
  addFloorSlab(node02, -24, -6, -34, -10, 4.2, 0.35, matConcreteLight, 'block_b_f2_west');
  addFloorSlab(node02, 6, 24, -34, -10, 4.2, 0.35, matConcreteLight, 'block_b_f2_east');
  addFloorSlab(node02, -6, 6, -34, -26, 4.2, 0.35, matConcreteLight, 'block_b_f2_north');

  // 3rd Floor Slab (Y = 8.4m) with stairwell access
  addFloorSlab(node02, -24, -5, -34, -10, 8.4, 0.35, matConcreteLight, 'block_b_f3_west');
  addFloorSlab(node02, 5, 24, -34, -10, 8.4, 0.35, matConcreteLight, 'block_b_f3_east');
  addFloorSlab(node02, -5, 5, -22, -10, 8.4, 0.35, matConcreteLight, 'block_b_f3_south_bridge');

  // Roof Canopy over side wings (Y = 12.6m)
  addFloorSlab(node02, -24, -10, -34, -10, 12.6, 0.4, matBrickTerra, 'block_b_roof_w');
  addFloorSlab(node02, 10, 24, -34, -10, 12.6, 0.4, matBrickTerra, 'block_b_roof_e');

  // Segmented Perimeter Walls for Block B with generous Doorways on South (Z=-10), North (Z=-34), West (X=-24), East (X=+24)
  // South Facade (Z = -10.5..-10.0) — Wide Central Monument Arch opening (-6..+6) + side doors
  addWallSegment(node02, -24, -15, -10.6, -10.0, 0, 12.6, matConcreteLight, 'BlockB S Wall W');
  addWallSegment(node02, -11, -6, -10.6, -10.0, 0, 12.6, matBrickTerra, 'BlockB S Pillar W');
  addWallSegment(node02, 6, 11, -10.6, -10.0, 0, 12.6, matBrickTerra, 'BlockB S Pillar E');
  addWallSegment(node02, 15, 24, -10.6, -10.0, 0, 12.6, matConcreteLight, 'BlockB S Wall E');

  // North Facade (Z = -34.0..-33.4) — Central Amphitheater exit opening (-6..+6)
  addWallSegment(node02, -24, -6, -34.0, -33.4, 0, 12.6, matConcreteLight, 'BlockB N Wall W');
  addWallSegment(node02, 6, 24, -34.0, -33.4, 0, 12.6, matConcreteLight, 'BlockB N Wall E');

  // West & East End Walls (Ground & 2nd floor closed except ground side doors; 3rd floor open for Skybridges!)
  addWallSegment(node02, -24.0, -23.4, -34, -25, 0, 8.4, matConcreteWarm, 'BlockB W Wall N');
  addWallSegment(node02, -24.0, -23.4, -19, -10, 0, 8.4, matConcreteWarm, 'BlockB W Wall S');
  addWallSegment(node02, 23.4, 24.0, -34, -25, 0, 8.4, matConcreteWarm, 'BlockB E Wall N');
  addWallSegment(node02, 23.4, 24.0, -19, -10, 0, 8.4, matConcreteWarm, 'BlockB E Wall S');

  // Signature 5.3m Circular Monument Arch above Block B Atrium
  const torusArch = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.9, 16, 36), matBrickTerra);
  torusArch.position.set(0, 9.6, -10.2);
  node02.add(torusArch);

  // Ground-Floor Table-Tennis Undercroft Tables inside Block B
  for (const tx of [-15, 15]) {
    const tt = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.85, 1.5), matChaiBlue);
    tt.position.set(tx, 0.45, -22);
    node02.add(tt);
  }

  // WALKABLE STAIRCASES IN BLOCK B:
  // 1) Grand Atrium Staircase: Ground (Y=0 at Z=-12) -> 2nd Floor North Landing (Y=4.2 at Z=-26)
  addWalkableStaircase(node02, {
    id: 'block_b_stair_f1_to_f2',
    minX: -3.5,
    maxX: 3.5,
    minZ: -26,
    maxZ: -12,
    axis: 'z',
    startCoord: -12,
    endCoord: -26,
    startY: 0,
    endY: 4.2,
  }, 16);

  // 2) Upper Atrium Staircase: 2nd Floor West/East Landings (Y=4.2 at Z=-32) -> 3rd Floor Skybridge Level (Y=8.4 at Z=-20)
  addWalkableStaircase(node02, {
    id: 'block_b_stair_f2_to_f3_west',
    minX: -9.5,
    maxX: -6.0,
    minZ: -32,
    maxZ: -18,
    axis: 'z',
    startCoord: -32,
    endCoord: -18,
    startY: 4.2,
    endY: 8.4,
  }, 16);

  addWalkableStaircase(node02, {
    id: 'block_b_stair_f2_to_f3_east',
    minX: 6.0,
    maxX: 9.5,
    minZ: -32,
    maxZ: -18,
    axis: 'z',
    startCoord: -32,
    endCoord: -18,
    startY: 4.2,
    endY: 8.4,
  }, 16);

  // 3) Elevated 3rd-Floor Walkable Skybridges (Y = 8.4m) connecting Block B (-24..+24) to Block A (-34) and Block C (+34)
  addFloorSlab(node02, -34, -24, -24.5, -19.5, 8.4, 0.4, matConcreteLight, 'skybridge_west_floor');
  addFloorSlab(node02, 24, 34, -24.5, -19.5, 8.4, 0.4, matConcreteLight, 'skybridge_east_floor');
  // Skybridge side glass railings (waist height so player won't fall off accidentally, can shoot over)
  for (const bx of [-29, 29]) {
    const railN = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.2), matWindowGlass);
    railN.position.set(bx, 8.95, -24.4);
    node02.add(railN);
    const railS = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.2), matWindowGlass);
    railS.position.set(bx, 8.95, -19.6);
    node02.add(railS);
  }

  rootGroup.add(node02);

  // ==========================================================================
  // 03_Academic_Block_A_West (Enterable Multi-Story Wing + Lecture Hall + Walkable Staircases)
  // ==========================================================================
  const node03 = new THREE.Group();
  node03.name = '03_Academic_Block_A_West';

  // Ground Floor Slab (X: -62..-34, Z: -26..+24)
  addFloorSlab(node03, -62, -34, -26, 24, 0.05, 0.1, matFloorTile, 'block_a_ground');
  // 2nd Floor Slab (Y = 4.2m) — leaves stairwell open along X: -40..-35, Z: -6..+10
  addFloorSlab(node03, -62, -40, -26, 24, 4.2, 0.35, matConcreteWarm, 'block_a_f2_main');
  addFloorSlab(node03, -40, -34, -26, -6, 4.2, 0.35, matConcreteWarm, 'block_a_f2_north');
  // 3rd Floor Slab (Y = 8.4m) — connects to West Skybridge at Z: -24.5..-19.5
  addFloorSlab(node03, -62, -34, -26, 6, 8.4, 0.35, matConcreteWarm, 'block_a_f3_main');

  // Block A Segmented Exterior Walls with Doorways on East Quadrangle face (X = -34) and South face (Z = 24)
  addWallSegment(node03, -62.0, -61.3, -26, 24, 0, 12.2, matConcreteWarm, 'BlockA West Outer Wall');
  addWallSegment(node03, -62, -34, -26.0, -25.3, 0, 12.2, matConcreteWarm, 'BlockA North Outer Wall');
  // South Wall with doorway gap (-48..-42)
  addWallSegment(node03, -62, -48, 23.3, 24.0, 0, 12.2, matBrickTerra, 'BlockA South Wall W');
  addWallSegment(node03, -42, -34, 23.3, 24.0, 0, 12.2, matBrickTerra, 'BlockA South Wall E');
  // East Courtyard Wall with 2 wide ground doorways (Z: -16..-10 and Z: +10..+17) and open 3rd-floor Skybridge portal
  addWallSegment(node03, -34.7, -34.0, -10, 10, 0, 8.0, matConcreteLight, 'BlockA East Mid Wall');
  addWallSegment(node03, -34.7, -34.0, 17, 24, 0, 8.0, matConcreteLight, 'BlockA East South Corner');

  // Interior Lecture Classroom Desks & Chalkboard in Block A Ground Floor
  const chalkboard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 7.5), matBadmintonGreen);
  chalkboard.position.set(-60.8, 1.9, 12);
  node03.add(chalkboard);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 2.2), matClayPitch);
      desk.position.set(-55 + row * 4.2, 0.4, 8 + col * 5.0);
      desk.castShadow = true;
      node03.add(desk);
    }
  }

  // Block A Walkable Staircases:
  // Stair 1: Ground (Y=0 at Z=+10) -> 2nd Floor (Y=4.2 at Z=-6)
  addWalkableStaircase(node03, {
    id: 'block_a_stair_f1_to_f2',
    minX: -39.8,
    maxX: -35.2,
    minZ: -6,
    maxZ: 10,
    axis: 'z',
    startCoord: 10,
    endCoord: -6,
    startY: 0,
    endY: 4.2,
  }, 16);

  // Stair 2: 2nd Floor (Y=4.2 at Z=+18) -> 3rd Floor Skybridge Level (Y=8.4 at Z=+6)
  addWalkableStaircase(node03, {
    id: 'block_a_stair_f2_to_f3',
    minX: -59.5,
    maxX: -55.0,
    minZ: 6,
    maxZ: 20,
    axis: 'z',
    startCoord: 20,
    endCoord: 6,
    startY: 4.2,
    endY: 8.4,
  }, 16);

  rootGroup.add(node03);

  // ==========================================================================
  // 04_Academic_Block_C_East (Enterable Multi-Story East Wing + Walkable Staircases)
  // ==========================================================================
  const node04 = new THREE.Group();
  node04.name = '04_Academic_Block_C_East';

  // Ground Floor Slab (X: 34..62, Z: -26..+24)
  addFloorSlab(node04, 34, 62, -26, 24, 0.05, 0.1, matFloorTile, 'block_c_ground');
  // 2nd Floor Slab (Y = 4.2m)
  addFloorSlab(node04, 40, 62, -26, 24, 4.2, 0.35, matConcreteWarm, 'block_c_f2_main');
  addFloorSlab(node04, 34, 40, -26, -6, 4.2, 0.35, matConcreteWarm, 'block_c_f2_north');
  // 3rd Floor Slab (Y = 8.4m) — connects to East Skybridge
  addFloorSlab(node04, 34, 62, -26, 6, 8.4, 0.35, matConcreteWarm, 'block_c_f3_main');

  // Block C Segmented Exterior Walls with Doorways
  addWallSegment(node04, 61.3, 62.0, -26, 24, 0, 12.2, matConcreteWarm, 'BlockC East Outer Wall');
  addWallSegment(node04, 34, 62, -26.0, -25.3, 0, 12.2, matConcreteWarm, 'BlockC North Outer Wall');
  addWallSegment(node04, 34, 42, 23.3, 24.0, 0, 12.2, matBrickTerra, 'BlockC South Wall W');
  addWallSegment(node04, 48, 62, 23.3, 24.0, 0, 12.2, matBrickTerra, 'BlockC South Wall E');
  addWallSegment(node04, 34.0, 34.7, -10, 10, 0, 8.0, matConcreteLight, 'BlockC West Mid Wall');
  addWallSegment(node04, 34.0, 34.7, 17, 24, 0, 8.0, matConcreteLight, 'BlockC West South Corner');

  // Block C Walkable Staircases:
  addWalkableStaircase(node04, {
    id: 'block_c_stair_f1_to_f2',
    minX: 35.2,
    maxX: 39.8,
    minZ: -6,
    maxZ: 10,
    axis: 'z',
    startCoord: 10,
    endCoord: -6,
    startY: 0,
    endY: 4.2,
  }, 16);

  addWalkableStaircase(node04, {
    id: 'block_c_stair_f2_to_f3',
    minX: 55.0,
    maxX: 59.5,
    minZ: 6,
    maxZ: 20,
    axis: 'z',
    startCoord: 20,
    endCoord: 6,
    startY: 4.2,
    endY: 8.4,
  }, 16);

  rootGroup.add(node04);

  // ==========================================================================
  // 05_Basement_Garage_And_Sports (Walkable Subterranean Ramp down to Y = -3.6m)
  // ==========================================================================
  const node05 = new THREE.Group();
  node05.name = '05_Basement_Garage_And_Sports';

  // Subterranean Basement Floor at Y = -3.6m (X: -48..-22, Z: 32..50)
  addFloorSlab(node05, -48, -22, 32, 50, -3.6, 0.3, matAsphalt, 'basement_garage_floor');

  // Walkable Ramp + Stairway descending from East entrance (X = -22, Y = 0) down into Basement (X = -34, Y = -3.6)
  addWalkableStaircase(node05, {
    id: 'basement_garage_ramp',
    minX: -34,
    maxX: -20,
    minZ: 37,
    maxZ: 45,
    axis: 'x',
    startCoord: -20,
    endCoord: -34,
    startY: 0,
    endY: -3.6,
  }, 14);

  // Retaining Walls around the Basement Pit (leaving X = -20 entrance open)
  addWallSegment(node05, -48.5, -20, 31.4, 32.1, -3.6, 1.2, matYellowSafety, 'Basement North Guard Wall');
  addWallSegment(node05, -48.5, -20, 49.9, 50.6, -3.6, 1.2, matYellowSafety, 'Basement South Guard Wall');
  addWallSegment(node05, -48.6, -47.9, 31.4, 50.6, -3.6, 1.2, matYellowSafety, 'Basement West Guard Wall');

  rootGroup.add(node05);

  // ==========================================================================
  // 06_Cafeteria_FoodCourt_Kiosk (Enterable Food Court + Blue 'Chai Life' Kiosk)
  // ==========================================================================
  const node06 = new THREE.Group();
  node06.name = '06_Cafeteria_FoodCourt_Kiosk';

  // Enterable Food Court Pavilion Floor & Roof Canopy (open colonnade on West & North)
  addFloorSlab(node06, 36, 62, 32, 50, 0.06, 0.12, matFloorTile, 'cafeteria_floor');
  addFloorSlab(node06, 36, 62, 32, 50, 4.6, 0.4, matBrickTerra, 'cafeteria_roof_canopy');
  addWallSegment(node06, 61.3, 62.0, 32, 50, 0, 4.6, matConcreteWarm, 'Cafeteria East Wall');
  addWallSegment(node06, 44, 62, 49.3, 50.0, 0, 4.6, matConcreteWarm, 'Cafeteria South Wall');

  // Walkable Exterior Staircase up onto the Cafeteria Roof Terrace (Y = 0 -> Y = 4.6m)
  addWalkableStaircase(node06, {
    id: 'cafeteria_roof_stair',
    minX: 36.5,
    maxX: 40.0,
    minZ: 50,
    maxZ: 60,
    axis: 'z',
    startCoord: 60,
    endCoord: 50,
    startY: 0,
    endY: 4.6,
  }, 14);

  // Signature Blue 'Chai Life' Kiosk (Enterable counter booth at X: 28..34, Z: 32..38)
  addFloorSlab(node06, 27.5, 33.5, 32.5, 38.5, 3.4, 0.3, matChaiBlue, 'chai_kiosk_roof');
  addWallSegment(node06, 27.5, 33.5, 32.5, 33.0, 0, 3.4, matChaiBlue, 'Chai Kiosk North Wall');
  addWallSegment(node06, 27.5, 28.0, 32.5, 36.5, 0, 1.1, matYellowSafety, 'Chai Kiosk Counter');

  const chaiLight = new THREE.PointLight(0x38bdf8, 2.2, 16);
  chaiLight.position.set(30.5, 3.2, 35.5);
  node06.add(chaiLight);
  beaconLights.push(chaiLight);

  rootGroup.add(node06);

  // ==========================================================================
  // 07_Sports_Amphitheater_Tower (Cricket Pitch, Walkable 9-Tier Amphitheater, Walkable Water Tower Sniper Platform)
  // ==========================================================================
  const node07 = new THREE.Group();
  node07.name = '07_Sports_Amphitheater_Tower';

  // Cricket Pitch (X = -32, Z = -58)
  const cricketPitch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 20.12), matClayPitch);
  cricketPitch.position.set(-32, 0.03, -58);
  cricketPitch.receiveShadow = true;
  node07.add(cricketPitch);

  // Walkable 9-Tier Stone Amphitheater (X: -8..+24, Z: -48..-64, rising from Y=0 to Y=4.5m)
  addWalkableStaircase(node07, {
    id: 'amphitheater_steps',
    minX: -6,
    maxX: 22,
    minZ: -64,
    maxZ: -48,
    axis: 'z',
    startCoord: -48,
    endCoord: -64,
    startY: 0,
    endY: 4.5,
  }, 9);
  addFloorSlab(node07, -6, 22, -68, -64, 4.5, 0.4, matConcreteLight, 'amphitheater_top_promenade');

  // 23.4m Mushroom Water Tower (X = 56, Z = -60) with Walkable Sniper Observation Platform at Y = 8.4m!
  const towerStem = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 17, 16), matConcreteLight);
  towerStem.position.set(56, 8.5, -60);
  towerStem.castShadow = true;
  node07.add(towerStem);
  addWallSegment(node07, 54.2, 57.8, -61.8, -58.2, 0, 16, matConcreteLight, 'Water Tower Core');

  const towerTank = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 4.4, 6.4, 20), matChaiBlue);
  towerTank.position.set(56, 19.8, -60);
  towerTank.castShadow = true;
  node07.add(towerTank);

  // Sniper Observation Deck around Water Tower at Y = 8.4m + Walkable Stairway up from Z = -42 to Z = -55
  addFloorSlab(node07, 49, 63, -66, -54, 8.4, 0.35, matDarkSteel, 'water_tower_sniper_deck');
  addWalkableStaircase(node07, {
    id: 'water_tower_sniper_stair',
    minX: 49.5,
    maxX: 53.0,
    minZ: -54,
    maxZ: -36,
    axis: 'z',
    startCoord: -36,
    endCoord: -54,
    startY: 0,
    endY: 8.4,
  }, 22);

  rootGroup.add(node07);

  // ==========================================================================
  // 08_Quadrangle_Badminton (Central Flagpole Plaza & Green Badminton Courts)
  // ==========================================================================
  const node08 = new THREE.Group();
  node08.name = '08_Quadrangle_Badminton';

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 0.5, 20), matConcreteLight);
  plinth.position.set(0, 0.25, 8);
  node08.add(plinth);

  const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 11.5, 12), matDarkSteel);
  flagpole.position.set(0, 5.75, 8);
  node08.add(flagpole);

  const flagMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.5, 8, 4),
    new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide, roughness: 0.5 })
  );
  flagMesh.position.set(1.3, 10.6, 8);
  node08.add(flagMesh);

  for (const courtX of [-16, 16]) {
    const court = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.06, 13.4), matBadmintonGreen);
    court.position.set(courtX, 0.03, 8);
    court.receiveShadow = true;
    node08.add(court);
  }

  rootGroup.add(node08);

  // ==========================================================================
  // 09_Vehicles_And_Landscaping (Mystery Supply Crates & Perimeter Trees)
  // ==========================================================================
  const node09 = new THREE.Group();
  node09.name = '09_Vehicles_And_Landscaping';

  const crateCoords: Array<[number, number, number]> = [
    [0, 0, -20],      // Inside Block B Ground Undercroft
    [-48, 0, 12],     // Inside Block A Lecture Hall
    [48, 0, 12],      // Inside Block C Ground Wing
    [0, 8.4, -16],    // On Block B 3rd-Floor Skybridge Hub
    [56, 8.4, -55],   // On Water Tower Sniper Observation Deck
    [-38, -3.6, 41],  // Inside Subterranean Basement Garage
  ];

  for (const [cx, cy, cz] of crateCoords) {
    const crate = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.0, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.35, metalness: 0.65 })
    );
    box.position.y = 0.5;
    box.castShadow = true;
    crate.add(box);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.14, 1.16),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.9,
      })
    );
    trim.position.y = 0.92;
    crate.add(trim);

    crate.position.set(cx, cy, cz);
    node09.add(crate);
    crateMeshes.push(crate);
  }

  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.85 });
  const treeCoords: Array<[number, number]> = [
    [-70, 50], [-40, 55], [25, 55], [68, 52],
    [-70, 10], [-70, -20], [70, 10], [70, -20],
    [-65, -52], [32, -62], [72, -55],
  ];
  for (const [tx, tz] of treeCoords) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 2.8, 8), treeTrunkMat);
    trunk.position.y = 1.4;
    tree.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5.2, 9), treeFoliageMat);
    crown.position.y = 4.5;
    tree.add(crown);
    tree.position.set(tx, 0, tz);
    node09.add(tree);
  }

  rootGroup.add(node09);
  scene.add(rootGroup);

  const spawnPoints = [
    { x: 0, z: 62 },
    { x: -50, z: 56 },
    { x: 52, z: 56 },
    { x: -68, z: 0 },
    { x: 68, z: 0 },
    { x: -45, z: -48 },
    { x: 0, z: -52 },
    { x: 45, z: -48 },
    { x: -18, z: -22 },
    { x: 18, z: -22 },
  ];

  const pickupLocations = [
    { x: 0, y: 0, z: 16 },
    { x: -18, y: 0, z: 8 },
    { x: 18, y: 0, z: 8 },
    { x: 0, y: 0, z: -20 },
    { x: -48, y: 0, z: 4 },
    { x: 48, y: 0, z: 4 },
    { x: 0, y: 8.4, z: -15 },
    { x: -29, y: 8.4, z: -22 },
    { x: 29, y: 8.4, z: -22 },
    { x: 56, y: 8.4, z: -56 },
    { x: -38, y: -3.6, z: 42 },
    { x: 48, y: 0, z: 40 },
  ];

  return {
    rootGroup,
    colliders,
    walls3D,
    stairs,
    floors,
    animatedProps: {
      flagMesh,
      beaconLights,
      crateMeshes,
    },
    spawnPoints,
    pickupLocations,
  };
}
