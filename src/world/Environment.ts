import * as THREE from 'three';
import { AssetManager } from '../game/AssetManager';
import { CollisionWorld } from './CollisionWorld';

export class EnvironmentBuilder {
  constructor(
    private readonly assets: AssetManager,
    private readonly collisionWorld: CollisionWorld
  ) {}

  createDesk(
    id: string,
    x: number,
    z: number,
    width = 2.0,
    depth = 0.9,
    rotY = 0
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const topMat = this.assets.getMaterial('wood_desk');
    const frameMat = this.assets.getMaterial('metal_dark');
    const brushMat = this.assets.getMaterial('metal_brushed');

    // Main desktop + metallic edge trim
    const top = new THREE.Mesh(this.assets.getBoxGeometry(width, 0.06, depth), topMat);
    top.position.set(0, 0.78, 0);
    top.castShadow = true;
    top.receiveShadow = true;

    const edgeTrim = new THREE.Mesh(
      this.assets.getBoxGeometry(width + 0.03, 0.03, depth + 0.03),
      brushMat
    );
    edgeTrim.position.set(0, 0.76, 0);

    // Modesty panel & Drawer pedestal
    const modesty = new THREE.Mesh(
      this.assets.getBoxGeometry(width - 0.16, 0.64, 0.05),
      frameMat
    );
    modesty.position.set(0, 0.42, -depth / 2 + 0.08);

    const legLeft = new THREE.Mesh(this.assets.getBoxGeometry(0.08, 0.75, depth - 0.08), frameMat);
    legLeft.position.set(-width / 2 + 0.08, 0.375, 0);

    const pedestal = new THREE.Mesh(
      this.assets.getBoxGeometry(0.46, 0.72, depth - 0.08),
      frameMat
    );
    pedestal.position.set(width / 2 - 0.27, 0.36, 0);

    // 3 Drawer fronts & metallic pulls
    for (let d = 0; d < 3; d++) {
      const dy = 0.18 + d * 0.22;
      const drawer = new THREE.Mesh(
        this.assets.getBoxGeometry(0.4, 0.18, 0.03),
        brushMat
      );
      drawer.position.set(width / 2 - 0.27, dy, depth / 2 - 0.03);
      group.add(drawer);
    }

    // Small architect desk lamp with glowing emissive bulb
    const lampBase = new THREE.Mesh(this.assets.getCylinderGeometry(0.09, 0.11, 0.04, 12), frameMat);
    lampBase.position.set(-width / 2 + 0.28, 0.83, -depth / 2 + 0.22);
    const lampStem = new THREE.Mesh(this.assets.getCylinderGeometry(0.015, 0.015, 0.34, 8), brushMat);
    lampStem.position.set(-width / 2 + 0.28, 1.0, -depth / 2 + 0.22);
    const lampShade = new THREE.Mesh(this.assets.getCylinderGeometry(0.06, 0.12, 0.1, 12), frameMat);
    lampShade.position.set(-width / 2 + 0.32, 1.16, -depth / 2 + 0.26);
    const lampBulb = new THREE.Mesh(
      this.assets.getCylinderGeometry(0.045, 0.075, 0.03, 10),
      this.assets.getMaterial('emissive_amber')
    );
    lampBulb.position.set(-width / 2 + 0.32, 1.11, -depth / 2 + 0.26);

    group.add(top, edgeTrim, modesty, legLeft, pedestal, lampBase, lampStem, lampShade, lampBulb);

    const sizeX = Math.abs(Math.cos(rotY)) > 0.5 ? width : depth;
    const sizeZ = Math.abs(Math.cos(rotY)) > 0.5 ? depth : width;
    this.collisionWorld.addBox(id, x, 0.42, z, sizeX, 0.84, sizeZ, {
      enabled: true,
      blocksSight: false,
      tag: 'prop'
    });
    return group;
  }

  createHospitalBed(id: string, x: number, z: number, rotY = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const frameMat = this.assets.getMaterial('metal_brushed');
    const darkMat = this.assets.getMaterial('metal_dark');
    const mattressMat = this.assets.getMaterial('medical_fabric');
    const pillowMat = this.assets.getMaterial('paper_note');

    const frame = new THREE.Mesh(this.assets.getBoxGeometry(1.12, 0.1, 2.12), frameMat);
    frame.position.set(0, 0.52, 0);

    const mattress = new THREE.Mesh(this.assets.getBoxGeometry(1.04, 0.18, 2.0), mattressMat);
    mattress.position.set(0, 0.66, 0);
    mattress.castShadow = true;
    mattress.receiveShadow = true;

    const sheet = new THREE.Mesh(this.assets.getBoxGeometry(1.06, 0.19, 1.25), pillowMat);
    sheet.position.set(0, 0.665, 0.34);

    const pillow = new THREE.Mesh(this.assets.getBoxGeometry(0.76, 0.1, 0.38), pillowMat);
    pillow.position.set(0, 0.79, -0.72);
    pillow.rotation.x = 0.14;

    const headboard = new THREE.Mesh(this.assets.getBoxGeometry(1.12, 0.98, 0.07), frameMat);
    headboard.position.set(0, 0.62, -1.05);

    const footboard = new THREE.Mesh(this.assets.getBoxGeometry(1.12, 0.74, 0.07), frameMat);
    footboard.position.set(0, 0.5, 1.05);

    // Side safety rails & corner legs with casters
    const railLeft = new THREE.Mesh(this.assets.getBoxGeometry(0.04, 0.26, 1.35), frameMat);
    railLeft.position.set(-0.56, 0.74, -0.1);
    const railRight = new THREE.Mesh(this.assets.getBoxGeometry(0.04, 0.26, 1.35), frameMat);
    railRight.position.set(0.56, 0.74, -0.1);

    for (const [lx, lz] of [
      [-0.5, -0.98],
      [0.5, -0.98],
      [-0.5, 0.98],
      [0.5, 0.98]
    ]) {
      const leg = new THREE.Mesh(this.assets.getCylinderGeometry(0.03, 0.03, 0.5, 10), darkMat);
      leg.position.set(lx, 0.25, lz);
      group.add(leg);
    }

    // Adjacent IV Drip Stand
    const ivPole = new THREE.Mesh(this.assets.getCylinderGeometry(0.016, 0.02, 1.75, 10), frameMat);
    ivPole.position.set(0.72, 0.88, -0.85);
    const ivBag = new THREE.Mesh(
      this.assets.getBoxGeometry(0.1, 0.18, 0.05),
      this.assets.getMaterial('glass_tinted')
    );
    ivBag.position.set(0.72, 1.62, -0.85);

    group.add(
      frame,
      mattress,
      sheet,
      pillow,
      headboard,
      footboard,
      railLeft,
      railRight,
      ivPole,
      ivBag
    );

    const sizeX = Math.abs(Math.cos(rotY)) > 0.5 ? 1.15 : 2.15;
    const sizeZ = Math.abs(Math.cos(rotY)) > 0.5 ? 2.15 : 1.15;
    this.collisionWorld.addBox(id, x, 0.5, z, sizeX, 1.0, sizeZ, {
      enabled: true,
      blocksSight: false,
      tag: 'prop'
    });
    return group;
  }

  createHidingLockerMesh(x: number, z: number, rotY = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const bodyMat = this.assets.getMaterial('metal_dark');
    const doorMat = this.assets.getMaterial('metal_brushed');
    const ventMat = this.assets.getMaterial('emissive_cyan');

    const body = new THREE.Mesh(this.assets.getBoxGeometry(0.98, 2.18, 0.86), bodyMat);
    body.position.set(0, 1.09, 0);
    body.castShadow = true;
    body.receiveShadow = true;

    // Twin recessed locker doors
    const leftDoor = new THREE.Mesh(this.assets.getBoxGeometry(0.42, 1.98, 0.05), doorMat);
    leftDoor.position.set(-0.22, 1.09, 0.43);
    const rightDoor = new THREE.Mesh(this.assets.getBoxGeometry(0.42, 1.98, 0.05), doorMat);
    rightDoor.position.set(0.22, 1.09, 0.43);

    // Handle latch & glowing cyan ventilation louvers
    const latch = new THREE.Mesh(this.assets.getBoxGeometry(0.04, 0.24, 0.08), bodyMat);
    latch.position.set(-0.04, 1.12, 0.45);

    const slit = new THREE.Mesh(this.assets.getBoxGeometry(0.68, 0.08, 0.07), ventMat);
    slit.position.set(0, 1.66, 0.44);

    group.add(body, leftDoor, rightDoor, latch, slit);
    return group;
  }

  createStorageShelf(id: string, x: number, z: number, width = 2.2, depth = 0.7, rotY = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const metalMat = this.assets.getMaterial('metal_rusted');
    const crateMat = this.assets.getMaterial('wood_desk');
    const brushMat = this.assets.getMaterial('metal_brushed');

    for (let h = 0.25; h <= 1.85; h += 0.52) {
      const plank = new THREE.Mesh(this.assets.getBoxGeometry(width, 0.05, depth), metalMat);
      plank.position.set(0, h, 0);
      plank.castShadow = true;
      plank.receiveShadow = true;
      group.add(plank);
    }

    const postOffsets = [
      [-width / 2 + 0.05, -depth / 2 + 0.05],
      [width / 2 - 0.05, -depth / 2 + 0.05],
      [-width / 2 + 0.05, depth / 2 - 0.05],
      [width / 2 - 0.05, depth / 2 - 0.05]
    ];

    for (const [px, pz] of postOffsets) {
      const post = new THREE.Mesh(this.assets.getBoxGeometry(0.07, 2.05, 0.07), metalMat);
      post.position.set(px, 1.025, pz);
      group.add(post);
    }

    // Crates & chemical drums on shelves
    const crate1 = new THREE.Mesh(this.assets.getBoxGeometry(0.52, 0.36, 0.46), crateMat);
    crate1.position.set(-0.48, 0.96, 0);
    const crate2 = new THREE.Mesh(this.assets.getBoxGeometry(0.44, 0.32, 0.44), crateMat);
    crate2.position.set(0.52, 1.47, 0);
    const drum = new THREE.Mesh(this.assets.getCylinderGeometry(0.18, 0.18, 0.42, 14), brushMat);
    drum.position.set(0.25, 0.48, 0);
    group.add(crate1, crate2, drum);

    const sizeX = Math.abs(Math.cos(rotY)) > 0.5 ? width : depth;
    const sizeZ = Math.abs(Math.cos(rotY)) > 0.5 ? depth : width;
    this.collisionWorld.addBox(id, x, 1.0, z, sizeX, 2.0, sizeZ, {
      enabled: true,
      blocksSight: false,
      tag: 'prop'
    });
    return group;
  }

  createContainmentPod(
    id: string,
    x: number,
    z: number,
    shattered = false
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const baseMat = this.assets.getMaterial('metal_dark');
    const brushMat = this.assets.getMaterial('metal_brushed');
    const glassMat = this.assets.getMaterial('glass_tinted');
    const glowMat = shattered
      ? this.assets.getMaterial('emissive_red')
      : this.assets.getMaterial('emissive_cyan');

    const base = new THREE.Mesh(this.assets.getCylinderGeometry(0.88, 0.96, 0.44, 18), baseMat);
    base.position.set(0, 0.22, 0);

    const cap = new THREE.Mesh(this.assets.getCylinderGeometry(0.92, 0.88, 0.34, 18), baseMat);
    cap.position.set(0, 2.56, 0);

    const ring = new THREE.Mesh(this.assets.getCylinderGeometry(0.78, 0.78, 0.08, 18), glowMat);
    ring.position.set(0, 0.46, 0);

    // Structural containment ribs
    for (const angle of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
      const rib = new THREE.Mesh(this.assets.getBoxGeometry(0.06, 2.2, 0.08), brushMat);
      rib.position.set(Math.cos(angle) * 0.82, 1.45, Math.sin(angle) * 0.82);
      rib.rotation.y = -angle;
      group.add(rib);
    }

    const upperRing = new THREE.Mesh(
      this.assets.getCylinderGeometry(0.78, 0.78, 0.08, 18),
      glowMat
    );
    upperRing.position.set(0, 2.34, 0);

    group.add(base, cap, ring, upperRing);

    if (!shattered) {
      const cylinder = new THREE.Mesh(
        this.assets.getCylinderGeometry(0.78, 0.78, 2.0, 18),
        glassMat
      );
      cylinder.position.set(0, 1.42, 0);
      group.add(cylinder);
    } else {
      const stain = new THREE.Mesh(
        this.assets.getBoxGeometry(2.2, 0.02, 2.2),
        this.assets.getMaterial('blood_grime')
      );
      stain.position.set(0, 0.01, 0.4);
      group.add(stain);
    }

    this.collisionWorld.addBox(id, x, 1.3, z, 1.65, 2.6, 1.65, {
      enabled: true,
      blocksSight: !shattered,
      tag: 'prop'
    });
    return group;
  }

  createTerminalMesh(x: number, y: number, z: number, rotY = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const standMat = this.assets.getMaterial('metal_dark');
    const brushMat = this.assets.getMaterial('metal_brushed');
    const screenMat = this.assets.getMaterial('emissive_cyan');

    const base = new THREE.Mesh(this.assets.getBoxGeometry(0.48, 0.05, 0.34), standMat);
    const monitor = new THREE.Mesh(this.assets.getBoxGeometry(0.6, 0.42, 0.09), standMat);
    monitor.position.set(0, 0.28, -0.04);

    const screen = new THREE.Mesh(this.assets.getBoxGeometry(0.52, 0.34, 0.02), screenMat);
    screen.position.set(0, 0.28, 0.01);

    // Keyboard deck in front of monitor
    const keyboard = new THREE.Mesh(this.assets.getBoxGeometry(0.42, 0.025, 0.16), brushMat);
    keyboard.position.set(0, 0.04, 0.16);

    group.add(base, monitor, screen, keyboard);
    return group;
  }

  createWallPanelMesh(
    x: number,
    y: number,
    z: number,
    rotY = 0,
    accentKey: 'emissive_amber' | 'emissive_red' | 'emissive_green' | 'emissive_cyan' = 'emissive_amber'
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const darkMat = this.assets.getMaterial('metal_dark');
    const brushMat = this.assets.getMaterial('metal_brushed');
    const hazardMat = this.assets.getMaterial('hazard_stripe');

    const box = new THREE.Mesh(this.assets.getBoxGeometry(0.76, 0.96, 0.18), darkMat);
    const innerDoor = new THREE.Mesh(this.assets.getBoxGeometry(0.66, 0.84, 0.04), brushMat);
    innerDoor.position.set(0, 0, 0.08);

    const accent = new THREE.Mesh(
      this.assets.getBoxGeometry(0.54, 0.2, 0.045),
      this.assets.getMaterial(accentKey)
    );
    accent.position.set(0, 0.22, 0.1);

    const hazardStrip = new THREE.Mesh(this.assets.getBoxGeometry(0.64, 0.1, 0.045), hazardMat);
    hazardStrip.position.set(0, -0.32, 0.085);

    // Vertical electrical conduits leading up to ceiling
    const conduitL = new THREE.Mesh(this.assets.getCylinderGeometry(0.03, 0.03, 1.6, 10), brushMat);
    conduitL.position.set(-0.22, 1.15, -0.02);
    const conduitR = new THREE.Mesh(this.assets.getCylinderGeometry(0.03, 0.03, 1.6, 10), brushMat);
    conduitR.position.set(0.22, 1.15, -0.02);

    group.add(box, innerDoor, accent, hazardStrip, conduitL, conduitR);
    return group;
  }

  createNoteMesh(x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const folder = new THREE.Mesh(
      this.assets.getBoxGeometry(0.34, 0.025, 0.44),
      this.assets.getMaterial('paper_note')
    );
    const marker = new THREE.Mesh(
      this.assets.getBoxGeometry(0.1, 0.035, 0.1),
      this.assets.getMaterial('emissive_amber')
    );
    marker.position.set(0.09, 0.018, -0.12);
    group.add(folder, marker);
    return group;
  }

  createKeyItemMesh(
    x: number,
    y: number,
    z: number,
    colorKey: 'emissive_amber' | 'emissive_cyan' | 'emissive_green' | 'emissive_red'
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const body = new THREE.Mesh(
      this.assets.getBoxGeometry(0.28, 0.07, 0.2),
      this.assets.getMaterial('metal_brushed')
    );
    const beacon = new THREE.Mesh(
      this.assets.getBoxGeometry(0.16, 0.09, 0.12),
      this.assets.getMaterial(colorKey)
    );
    beacon.position.set(0, 0.035, 0);
    group.add(body, beacon);
    return group;
  }

  createRoomSign(text: string, x: number, y: number, z: number, rotY = 0): THREE.Mesh {
    let signTex: THREE.CanvasTexture | null = null;
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (typeof document !== 'undefined' && !isJsdom) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d');
      } catch {
        ctx = null;
      }
      if (ctx) {
        ctx.fillStyle = '#0c141c';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#4fd1c5';
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 116);
        ctx.fillStyle = '#4fd1c5';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AETHER-9 SECTOR B-09', 256, 34);
        ctx.fillStyle = '#f0f8ff';
        ctx.font = 'bold 34px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 78);
        signTex = new THREE.CanvasTexture(canvas);
        signTex.colorSpace = THREE.SRGBColorSpace;
        signTex.anisotropy = 8;
      }
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: signTex,
      emissive: 0x1e4452,
      emissiveMap: signTex,
      emissiveIntensity: 0.95,
      roughness: 0.3
    });

    const mesh = new THREE.Mesh(this.assets.getBoxGeometry(1.42, 0.36, 0.06), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    return mesh;
  }

  createOverheadPipe(x: number, y: number, z: number, length: number, axis: 'x' | 'z'): THREE.Mesh {
    const geo = this.assets.getCylinderGeometry(0.09, 0.09, length, 12);
    const mesh = new THREE.Mesh(geo, this.assets.getMaterial('metal_rusted'));
    mesh.position.set(x, y, z);
    if (axis === 'x') {
      mesh.rotation.z = Math.PI / 2;
    } else {
      mesh.rotation.x = Math.PI / 2;
    }
    return mesh;
  }
}
