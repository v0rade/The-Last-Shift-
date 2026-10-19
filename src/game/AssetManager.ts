import * as THREE from 'three';

export type MaterialKey =
  | 'wall_plaster'
  | 'wall_tile_lower'
  | 'wall_concrete'
  | 'floor_tile'
  | 'floor_industrial'
  | 'ceiling_panel'
  | 'metal_dark'
  | 'metal_brushed'
  | 'metal_rusted'
  | 'wood_desk'
  | 'glass_tinted'
  | 'medical_fabric'
  | 'blood_grime'
  | 'emissive_red'
  | 'emissive_green'
  | 'emissive_cyan'
  | 'emissive_amber'
  | 'paper_note'
  | 'hazard_stripe';

export class AssetManager {
  private materials: Map<MaterialKey, THREE.Material> = new Map();
  private textures: THREE.Texture[] = [];
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private progress = 0;
  private maxAnisotropy = 8;

  setMaxAnisotropy(anisotropy: number): void {
    this.maxAnisotropy = Math.max(1, anisotropy);
    for (const tex of this.textures) {
      tex.anisotropy = this.maxAnisotropy;
      tex.needsUpdate = true;
    }
  }

  async initialize(onProgress?: (pct: number, label: string) => void): Promise<void> {
    const steps: Array<{ label: string; run: () => void }> = [
      { label: 'Synthesizing 512px PBR architectural textures & bump maps...', run: () => this.buildArchitecturalMaterials() },
      { label: 'Synthesizing industrial, metallic & medical surface maps...', run: () => this.buildPropMaterials() },
      { label: 'Compiling calibrated emissive & emergency shader states...', run: () => this.buildEmissiveMaterials() },
      { label: 'Caching modular facility geometry primitives...', run: () => this.buildSharedGeometries() }
    ];

    for (let i = 0; i < steps.length; i++) {
      steps[i].run();
      this.progress = Math.round(((i + 1) / steps.length) * 100);
      if (onProgress) {
        onProgress(this.progress, steps[i].label);
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  getProgress(): number {
    return this.progress;
  }

  getMaterial(key: MaterialKey): THREE.Material {
    const mat = this.materials.get(key);
    if (!mat) {
      const fallback = new THREE.MeshStandardMaterial({ color: 0x46505a, roughness: 0.75 });
      this.materials.set(key, fallback);
      return fallback;
    }
    return mat;
  }

  getBoxGeometry(w: number, h: number, d: number): THREE.BoxGeometry {
    const key = `box_${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
    let geo = this.geometries.get(key) as THREE.BoxGeometry | undefined;
    if (!geo) {
      geo = new THREE.BoxGeometry(w, h, d);
      this.geometries.set(key, geo);
    }
    return geo;
  }

  getCylinderGeometry(rt: number, rb: number, h: number, segs = 16): THREE.CylinderGeometry {
    const key = `cyl_${rt.toFixed(2)}_${rb.toFixed(2)}_${h.toFixed(2)}_${segs}`;
    let geo = this.geometries.get(key) as THREE.CylinderGeometry | undefined;
    if (!geo) {
      geo = new THREE.CylinderGeometry(rt, rb, h, segs);
      this.geometries.set(key, geo);
    }
    return geo;
  }

  private createProceduralTexture(
    size: number,
    drawFn: (ctx: CanvasRenderingContext2D, size: number) => void,
    repeatX = 1,
    repeatY = 1,
    isColorMap = true
  ): THREE.Texture | null {
    if (typeof document === 'undefined') return null;
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    let tex: THREE.Texture | null = null;

    if (!isJsdom) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d');
      } catch {
        ctx = null;
      }
      if (ctx) {
        drawFn(ctx, size);
        tex = new THREE.CanvasTexture(canvas);
      }
    }

    if (!tex) {
      tex = new THREE.DataTexture(new Uint8Array(16), 2, 2);
    }

    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = this.maxAnisotropy;
    tex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.needsUpdate = true;
    this.textures.push(tex);
    return tex;
  }

  private buildArchitecturalMaterials(): void {
    // 1. Hospital Painted Plaster Wall (512x512)
    const wallAlbedo = this.createProceduralTexture(
      512,
      (ctx, s) => {
        const grad = ctx.createLinearGradient(0, 0, 0, s);
        grad.addColorStop(0, '#495662');
        grad.addColorStop(0.75, '#414d58');
        grad.addColorStop(1, '#323c45');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);

        // Subtle drywall panel seam
        ctx.strokeStyle = 'rgba(22, 28, 34, 0.38)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 0.5, 0);
        ctx.lineTo(s * 0.5, s);
        ctx.stroke();

        // Fine plaster grain & micro-imperfections
        for (let i = 0; i < 2400; i++) {
          const x = (i * 97 + (i % 7) * 13) % s;
          const y = (i * 53 + (i % 11) * 19) % s;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(12, 16, 20, 0.07)';
          ctx.fillRect(x, y, 2, 2);
        }

        // Damp grime near bottom edge
        const stainGrad = ctx.createLinearGradient(0, s - 64, 0, s);
        stainGrad.addColorStop(0, 'rgba(18, 24, 22, 0)');
        stainGrad.addColorStop(1, 'rgba(14, 19, 17, 0.55)');
        ctx.fillStyle = stainGrad;
        ctx.fillRect(0, s - 64, s, 64);
      },
      1,
      1,
      true
    );

    const wallBump = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 3000; i++) {
          const x = (i * 73) % s;
          const y = (i * 41) % s;
          ctx.fillStyle = i % 2 === 0 ? '#969696' : '#6a6a6a';
          ctx.fillRect(x, y, 2, 2);
        }
      },
      1,
      1,
      false
    );

    // 2. Lower Glazed Ceramic Wainscoting Tile (512x512)
    const lowerTileAlbedo = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#1f2930';
        ctx.fillRect(0, 0, s, s);

        const cols = 4;
        const rows = 8;
        const tw = s / cols;
        const th = s / rows;

        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (tw * 0.5);
          for (let c = -1; c <= cols; c++) {
            const x = c * tw + offset;
            const y = r * th;
            ctx.fillStyle = (r + c) % 2 === 0 ? '#2f404a' : '#2b3b44';
            ctx.fillRect(x + 3, y + 3, tw - 6, th - 6);

            // Subtle highlight along top edge of each glazed tile
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x + 4, y + 4, tw - 8, 3);
          }
        }
      },
      1,
      1,
      true
    );

    const lowerTileBump = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#303030'; // recessed grout
        ctx.fillRect(0, 0, s, s);
        const cols = 4;
        const rows = 8;
        const tw = s / cols;
        const th = s / rows;
        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (tw * 0.5);
          for (let c = -1; c <= cols; c++) {
            ctx.fillStyle = '#d0d0d0'; // raised tile face
            ctx.fillRect(c * tw + offset + 3, r * th + 3, tw - 6, th - 6);
          }
        }
      },
      1,
      1,
      false
    );

    // 3. Institutional Terrazzo Floor Tile (512x512)
    const floorTileAlbedo = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#192026';
        ctx.fillRect(0, 0, s, s);

        const grid = 2;
        const cell = s / grid;
        for (let gy = 0; gy < grid; gy++) {
          for (let gx = 0; gx < grid; gx++) {
            const x = gx * cell;
            const y = gy * cell;
            ctx.fillStyle = (gx + gy) % 2 === 0 ? '#313b44' : '#2d3740';
            ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);

            // Terrazzo mineral speckles
            for (let k = 0; k < 220; k++) {
              const sx = x + 8 + ((k * 47 + gx * 19) % (cell - 16));
              const sy = y + 8 + ((k * 83 + gy * 29) % (cell - 16));
              ctx.fillStyle = k % 3 === 0 ? 'rgba(210, 225, 235, 0.14)' : 'rgba(20, 26, 30, 0.22)';
              ctx.fillRect(sx, sy, 3, 3);
            }
          }
        }

        // Subtle scuff marks
        ctx.strokeStyle = 'rgba(15, 19, 22, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 110);
        ctx.lineTo(145, 135);
        ctx.moveTo(310, 380);
        ctx.lineTo(390, 360);
        ctx.stroke();
      },
      1,
      1,
      true
    );

    const floorTileBump = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#282828';
        ctx.fillRect(0, 0, s, s);
        const grid = 2;
        const cell = s / grid;
        for (let gy = 0; gy < grid; gy++) {
          for (let gx = 0; gx < grid; gx++) {
            ctx.fillStyle = '#b8b8b8';
            ctx.fillRect(gx * cell + 4, gy * cell + 4, cell - 8, cell - 8);
          }
        }
      },
      1,
      1,
      false
    );

    // 4. Reinforced Concrete & Industrial Floor (512x512)
    const concreteAlbedo = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#363b40';
        ctx.fillRect(0, 0, s, s);

        // Formwork seams & tie holes
        ctx.strokeStyle = 'rgba(20, 23, 26, 0.45)';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, s - 8, s / 2 - 8);
        ctx.strokeRect(4, s / 2 + 4, s - 8, s / 2 - 8);

        for (const [hx, hy] of [
          [64, 128],
          [448, 128],
          [64, 384],
          [448, 384]
        ]) {
          ctx.fillStyle = '#1b1e21';
          ctx.beginPath();
          ctx.arc(hx, hy, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        for (let i = 0; i < 2800; i++) {
          const x = (i * 61) % s;
          const y = (i * 89) % s;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(18, 20, 22, 0.16)' : 'rgba(210, 218, 224, 0.06)';
          ctx.fillRect(x, y, 2, 2);
        }
      },
      1,
      1,
      true
    );

    // 5. Acoustic Drop Ceiling Grid (512x512)
    const ceilingAlbedo = this.createProceduralTexture(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#232930';
        ctx.fillRect(0, 0, s, s);
        const cell = s / 2;
        for (let gy = 0; gy < 2; gy++) {
          for (let gx = 0; gx < 2; gx++) {
            ctx.fillStyle = '#2d353e';
            ctx.fillRect(gx * cell + 6, gy * cell + 6, cell - 12, cell - 12);
            for (let p = 0; p < 180; p++) {
              const px = gx * cell + 12 + ((p * 29) % (cell - 24));
              const py = gy * cell + 12 + ((p * 43) % (cell - 24));
              ctx.fillStyle = 'rgba(10, 14, 18, 0.35)';
              ctx.fillRect(px, py, 2, 2);
            }
          }
        }
      },
      1,
      1,
      true
    );

    this.materials.set(
      'wall_plaster',
      new THREE.MeshStandardMaterial({
        color: 0xd8e2ea,
        map: wallAlbedo,
        bumpMap: wallBump,
        bumpScale: 0.015,
        roughness: 0.78,
        metalness: 0.06
      })
    );

    this.materials.set(
      'wall_tile_lower',
      new THREE.MeshStandardMaterial({
        color: 0xd0e0e8,
        map: lowerTileAlbedo,
        bumpMap: lowerTileBump,
        bumpScale: 0.025,
        roughness: 0.38,
        metalness: 0.18
      })
    );

    this.materials.set(
      'wall_concrete',
      new THREE.MeshStandardMaterial({
        color: 0xc8d0d8,
        map: concreteAlbedo,
        bumpMap: wallBump,
        bumpScale: 0.03,
        roughness: 0.84,
        metalness: 0.08
      })
    );

    this.materials.set(
      'floor_tile',
      new THREE.MeshStandardMaterial({
        color: 0xd4dee6,
        map: floorTileAlbedo,
        bumpMap: floorTileBump,
        bumpScale: 0.02,
        roughness: 0.42,
        metalness: 0.16
      })
    );

    this.materials.set(
      'floor_industrial',
      new THREE.MeshStandardMaterial({
        color: 0xb0bac2,
        map: concreteAlbedo,
        bumpMap: floorTileBump,
        bumpScale: 0.03,
        roughness: 0.62,
        metalness: 0.32
      })
    );

    this.materials.set(
      'ceiling_panel',
      new THREE.MeshStandardMaterial({
        color: 0xc2ccd4,
        map: ceilingAlbedo,
        bumpMap: floorTileBump,
        bumpScale: 0.018,
        roughness: 0.82,
        metalness: 0.12
      })
    );
  }

  private buildPropMaterials(): void {
    const brushedMetalTex = this.createProceduralTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#687480';
        ctx.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 2) {
          ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, y, s, 1);
        }
      },
      2,
      2,
      true
    );

    const woodGrainTex = this.createProceduralTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#523d2e';
        ctx.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 3) {
          ctx.fillStyle = y % 6 === 0 ? 'rgba(32, 20, 12, 0.32)' : 'rgba(110, 82, 60, 0.18)';
          ctx.fillRect(0, y, s, 2);
        }
      },
      2,
      2,
      true
    );

    const hazardTex = this.createProceduralTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#d69e2e';
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = '#1a202c';
        for (let i = -s; i < s * 2; i += 48) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 24, 0);
          ctx.lineTo(i - 24 + s, s);
          ctx.lineTo(i - 48 + s, s);
          ctx.closePath();
          ctx.fill();
        }
      },
      2,
      1,
      true
    );

    this.materials.set(
      'metal_dark',
      new THREE.MeshStandardMaterial({
        color: 0x343d46,
        map: brushedMetalTex,
        roughness: 0.38,
        metalness: 0.78
      })
    );

    this.materials.set(
      'metal_brushed',
      new THREE.MeshStandardMaterial({
        color: 0x7c8b99,
        map: brushedMetalTex,
        roughness: 0.28,
        metalness: 0.85
      })
    );

    this.materials.set(
      'metal_rusted',
      new THREE.MeshStandardMaterial({
        color: 0x6b4838,
        map: brushedMetalTex,
        roughness: 0.68,
        metalness: 0.55
      })
    );

    this.materials.set(
      'wood_desk',
      new THREE.MeshStandardMaterial({
        color: 0x8c6d53,
        map: woodGrainTex,
        roughness: 0.58,
        metalness: 0.08
      })
    );

    this.materials.set(
      'glass_tinted',
      new THREE.MeshStandardMaterial({
        color: 0x68a0b0,
        roughness: 0.12,
        metalness: 0.25,
        transparent: true,
        opacity: 0.46
      })
    );

    this.materials.set(
      'medical_fabric',
      new THREE.MeshStandardMaterial({
        color: 0x527570,
        roughness: 0.82,
        metalness: 0.04
      })
    );

    this.materials.set(
      'blood_grime',
      new THREE.MeshStandardMaterial({
        color: 0x4a1414,
        roughness: 0.35,
        metalness: 0.12
      })
    );

    this.materials.set(
      'paper_note',
      new THREE.MeshStandardMaterial({
        color: 0xede6d6,
        emissive: 0x383428,
        emissiveIntensity: 0.45,
        roughness: 0.72
      })
    );

    this.materials.set(
      'hazard_stripe',
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: hazardTex,
        roughness: 0.5,
        metalness: 0.2
      })
    );
  }

  private buildEmissiveMaterials(): void {
    this.materials.set(
      'emissive_red',
      new THREE.MeshStandardMaterial({
        color: 0xff3b3b,
        emissive: 0xff2222,
        emissiveIntensity: 2.2,
        roughness: 0.25
      })
    );

    this.materials.set(
      'emissive_green',
      new THREE.MeshStandardMaterial({
        color: 0x38ff88,
        emissive: 0x1ee068,
        emissiveIntensity: 2.0,
        roughness: 0.25
      })
    );

    this.materials.set(
      'emissive_cyan',
      new THREE.MeshStandardMaterial({
        color: 0x5cf0ff,
        emissive: 0x28c8e0,
        emissiveIntensity: 1.9,
        roughness: 0.22
      })
    );

    this.materials.set(
      'emissive_amber',
      new THREE.MeshStandardMaterial({
        color: 0xffb838,
        emissive: 0xf09000,
        emissiveIntensity: 2.0,
        roughness: 0.25
      })
    );
  }

  private buildSharedGeometries(): void {
    this.getBoxGeometry(1, 1, 1);
    this.getCylinderGeometry(0.08, 0.08, 1, 12);
  }

  dispose(): void {
    for (const tex of this.textures) {
      tex.dispose();
    }
    this.textures = [];
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
    for (const geo of this.geometries.values()) {
      geo.dispose();
    }
    this.geometries.clear();
  }
}
