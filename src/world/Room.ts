import * as THREE from 'three';
import { AssetManager, MaterialKey } from '../game/AssetManager';
import { CollisionWorld } from './CollisionWorld';

export interface DoorOpening {
  offset: number;
  width: number;
  height?: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  height?: number;
  floorMaterial?: MaterialKey;
  wallMaterial?: MaterialKey;
  northOpenings?: DoorOpening[];
  southOpenings?: DoorOpening[];
  eastOpenings?: DoorOpening[];
  westOpenings?: DoorOpening[];
}

export class Room {
  public readonly id: string;
  public readonly name: string;
  public readonly group = new THREE.Group();
  public readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(
    spec: RoomSpec,
    assets: AssetManager,
    collisionWorld: CollisionWorld
  ) {
    this.id = spec.id;
    this.name = spec.name;
    const h = spec.height ?? 3.4;
    const halfW = spec.width / 2;
    const halfD = spec.depth / 2;

    this.bounds = {
      minX: spec.centerX - halfW,
      maxX: spec.centerX + halfW,
      minZ: spec.centerZ - halfD,
      maxZ: spec.centerZ + halfD
    };

    const floorMat = assets.getMaterial(spec.floorMaterial ?? 'floor_tile');
    const ceilingMat = assets.getMaterial('ceiling_panel');
    const wallMat = assets.getMaterial(spec.wallMaterial ?? 'wall_plaster');
    const lowerMat = assets.getMaterial('wall_tile_lower');
    const trimMat = assets.getMaterial('metal_dark');
    const railMat = assets.getMaterial('metal_brushed');

    // World-space UV mapped Floor (1.5m per tile pair)
    const floorGeo = this.createWorldUVBox(spec.width, 0.12, spec.depth, 1.5);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(spec.centerX, -0.06, spec.centerZ);
    floorMesh.receiveShadow = true;
    this.group.add(floorMesh);

    // World-space UV mapped Ceiling (1.6m per acoustic panel pair)
    const ceilingGeo = this.createWorldUVBox(spec.width, 0.14, spec.depth, 1.6);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(spec.centerX, h + 0.07, spec.centerZ);
    this.group.add(ceilingMesh);

    // Structural ceiling beams & recessed ventilation grilles
    const beamSpacing = 4.5;
    for (let z = spec.centerZ - halfD + 2.2; z <= spec.centerZ + halfD - 1.8; z += beamSpacing) {
      const beam = new THREE.Mesh(
        assets.getBoxGeometry(spec.width - 0.28, 0.12, 0.18),
        trimMat
      );
      beam.position.set(spec.centerX, h - 0.06, z);
      this.group.add(beam);
    }

    // Center ventilation grille in ceiling
    const ventFrame = new THREE.Mesh(assets.getBoxGeometry(0.75, 0.04, 0.75), railMat);
    ventFrame.position.set(spec.centerX + (spec.width > 7 ? 1.8 : -1.2), h - 0.02, spec.centerZ);
    this.group.add(ventFrame);

    // Build 4 perimeter walls with optional doorway openings
    this.buildWallWithOpenings(
      `${spec.id}_north`,
      spec.centerX,
      spec.centerZ - halfD,
      spec.width,
      h,
      'x',
      spec.northOpenings ?? [],
      wallMat,
      lowerMat,
      trimMat,
      railMat,
      assets,
      collisionWorld
    );

    this.buildWallWithOpenings(
      `${spec.id}_south`,
      spec.centerX,
      spec.centerZ + halfD,
      spec.width,
      h,
      'x',
      spec.southOpenings ?? [],
      wallMat,
      lowerMat,
      trimMat,
      railMat,
      assets,
      collisionWorld
    );

    this.buildWallWithOpenings(
      `${spec.id}_west`,
      spec.centerX - halfW,
      spec.centerZ,
      spec.depth,
      h,
      'z',
      spec.westOpenings ?? [],
      wallMat,
      lowerMat,
      trimMat,
      railMat,
      assets,
      collisionWorld
    );

    this.buildWallWithOpenings(
      `${spec.id}_east`,
      spec.centerX + halfW,
      spec.centerZ,
      spec.depth,
      h,
      'z',
      spec.eastOpenings ?? [],
      wallMat,
      lowerMat,
      trimMat,
      railMat,
      assets,
      collisionWorld
    );
  }

  private createWorldUVBox(sx: number, sy: number, sz: number, tileMeters: number): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));

      if (ny > 0.5) {
        // Top / Bottom face (floor & ceiling)
        uv.setXY(i, (vx + sx * 0.5) / tileMeters, (vz + sz * 0.5) / tileMeters);
      } else if (nx > 0.5) {
        // East / West wall face
        uv.setXY(i, (vz + sz * 0.5) / tileMeters, (vy + sy * 0.5) / tileMeters);
      } else {
        // North / South wall face
        uv.setXY(i, (vx + sx * 0.5) / tileMeters, (vy + sy * 0.5) / tileMeters);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  private buildWallWithOpenings(
    wallPrefix: string,
    wallCenterX: number,
    wallCenterZ: number,
    totalLength: number,
    wallHeight: number,
    axis: 'x' | 'z',
    openings: DoorOpening[],
    wallMat: THREE.Material,
    lowerMat: THREE.Material,
    trimMat: THREE.Material,
    railMat: THREE.Material,
    assets: AssetManager,
    collisionWorld: CollisionWorld
  ): void {
    const thickness = 0.24;
    const halfLen = totalLength / 2;
    const sorted = [...openings].sort((a, b) => a.offset - b.offset);

    let cursor = -halfLen;
    let segIdx = 0;

    const addSolidSegment = (startOffset: number, endOffset: number) => {
      const segLen = endOffset - startOffset;
      if (segLen <= 0.05) return;
      const midOffset = (startOffset + endOffset) * 0.5;
      const cx = axis === 'x' ? wallCenterX + midOffset : wallCenterX;
      const cz = axis === 'z' ? wallCenterZ + midOffset : wallCenterZ;
      const sx = axis === 'x' ? segLen : thickness;
      const sz = axis === 'z' ? segLen : thickness;

      // Upper wall with world-space UV mapping
      const wallGeo = this.createWorldUVBox(sx, wallHeight, sz, 2.2);
      const mesh = new THREE.Mesh(wallGeo, wallMat);
      mesh.position.set(cx, wallHeight / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Lower glazed tile wainscoting (1.15m tall) with world-space UV mapping
      const wainscotH = 1.15;
      const wSx = axis === 'x' ? segLen : thickness + 0.025;
      const wSz = axis === 'z' ? segLen : thickness + 0.025;
      const wainscotGeo = this.createWorldUVBox(wSx, wainscotH, wSz, 1.15);
      const wainscot = new THREE.Mesh(wainscotGeo, lowerMat);
      wainscot.position.set(cx, wainscotH / 2, cz);
      this.group.add(wainscot);

      // Brushed metal chair-rail trim at top of wainscoting
      const railSx = axis === 'x' ? segLen : thickness + 0.05;
      const railSz = axis === 'z' ? segLen : thickness + 0.05;
      const chairRail = new THREE.Mesh(assets.getBoxGeometry(railSx, 0.055, railSz), railMat);
      chairRail.position.set(cx, wainscotH + 0.02, cz);
      this.group.add(chairRail);

      // Dark rubber floor skirting baseboard
      const baseBoard = new THREE.Mesh(assets.getBoxGeometry(railSx, 0.12, railSz), trimMat);
      baseBoard.position.set(cx, 0.06, cz);
      this.group.add(baseBoard);

      // Upper ceiling cornice trim
      const cornice = new THREE.Mesh(assets.getBoxGeometry(railSx, 0.08, railSz), trimMat);
      cornice.position.set(cx, wallHeight - 0.04, cz);
      this.group.add(cornice);

      collisionWorld.addBox(
        `${wallPrefix}_seg_${segIdx++}`,
        cx,
        wallHeight / 2,
        cz,
        sx,
        wallHeight,
        sz,
        { enabled: true, blocksSight: true, tag: 'wall' }
      );
    };

    for (const op of sorted) {
      const opStart = op.offset - op.width / 2;
      const opEnd = op.offset + op.width / 2;
      const doorH = op.height ?? 2.7;

      if (opStart > cursor) {
        addSolidSegment(cursor, opStart);
      }

      // Header transom above doorway
      const transomH = wallHeight - doorH;
      if (transomH > 0.05) {
        const cx = axis === 'x' ? wallCenterX + op.offset : wallCenterX;
        const cz = axis === 'z' ? wallCenterZ + op.offset : wallCenterZ;
        const sx = axis === 'x' ? op.width : thickness;
        const sz = axis === 'z' ? op.width : thickness;

        const transomGeo = this.createWorldUVBox(sx, transomH, sz, 2.2);
        const transom = new THREE.Mesh(transomGeo, wallMat);
        transom.position.set(cx, doorH + transomH / 2, cz);
        this.group.add(transom);
      }

      cursor = opEnd;
    }

    if (cursor < halfLen) {
      addSolidSegment(cursor, halfLen);
    }
  }
}
