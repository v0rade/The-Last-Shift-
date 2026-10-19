import * as THREE from 'three';
import { AssetManager } from '../game/AssetManager';

export interface LightFixture {
  id: string;
  light: THREE.PointLight;
  bulbMesh: THREE.Mesh;
  baseIntensity: number;
  flickerSpeed: number;
  requiresPower: boolean;
  isEmergencyRed: boolean;
}

export class Lighting {
  public readonly group = new THREE.Group();
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private dirShadowLight: THREE.DirectionalLight;
  private fixtures: LightFixture[] = [];
  private powerRestored = false;
  private disturbanceTimer = 0;
  private reducedFlashing = false;
  private elapsed = 0;

  constructor(private readonly assets: AssetManager) {
    // Balanced dark-clinical ambient & hemisphere fill so silhouettes and walls are readable
    this.ambientLight = new THREE.AmbientLight(0x263544, 0.82);
    this.hemiLight = new THREE.HemisphereLight(0x3a5268, 0x121820, 0.72);

    // Subtle top-down directional fill for depth and furniture contour definition
    this.dirShadowLight = new THREE.DirectionalLight(0x6c8ca8, 0.48);
    this.dirShadowLight.position.set(4, 14, -16);
    this.dirShadowLight.castShadow = false;

    this.group.add(this.ambientLight, this.hemiLight, this.dirShadowLight);
  }

  addFixture(config: {
    id: string;
    x: number;
    y?: number;
    z: number;
    color: number;
    intensity: number;
    distance?: number;
    flickerSpeed?: number;
    requiresPower?: boolean;
    isEmergencyRed?: boolean;
  }): LightFixture {
    const y = config.y ?? 3.24;
    const isEmergency = config.isEmergencyRed ?? false;
    const requiresPower = config.requiresPower ?? false;

    const housingMat = this.assets.getMaterial('metal_dark');
    const louverMat = this.assets.getMaterial('metal_brushed');

    const fixtureGroup = new THREE.Group();
    fixtureGroup.position.set(config.x, y, config.z);

    // Recessed troffer housing + metallic reflector fins
    const housing = new THREE.Mesh(
      this.assets.getBoxGeometry(isEmergency ? 0.44 : 1.24, 0.09, isEmergency ? 0.28 : 0.42),
      housingMat
    );
    housing.position.set(0, 0.08, 0);
    fixtureGroup.add(housing);

    if (!isEmergency) {
      for (const lx of [-0.4, 0, 0.4]) {
        const louver = new THREE.Mesh(this.assets.getBoxGeometry(0.03, 0.06, 0.38), louverMat);
        louver.position.set(lx, 0.03, 0);
        fixtureGroup.add(louver);
      }
    }

    const bulbMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: requiresPower && !this.powerRestored ? 0.35 : 2.1,
      roughness: 0.18
    });
    const bulbMesh = new THREE.Mesh(
      this.assets.getBoxGeometry(isEmergency ? 0.32 : 1.08, 0.045, isEmergency ? 0.18 : 0.28),
      bulbMat
    );
    bulbMesh.position.set(0, 0.02, 0);
    fixtureGroup.add(bulbMesh);

    // Calibrated physically plausible intensity & falloff
    const scaledBaseIntensity = config.intensity * 3.4;
    const standbyIntensity = scaledBaseIntensity * 0.18;

    const light = new THREE.PointLight(
      config.color,
      requiresPower && !this.powerRestored ? standbyIntensity : scaledBaseIntensity,
      config.distance ?? 17.5,
      1.25
    );
    light.position.set(config.x, y - 0.18, config.z);

    this.group.add(fixtureGroup, light);

    const fixture: LightFixture = {
      id: config.id,
      light,
      bulbMesh,
      baseIntensity: scaledBaseIntensity,
      flickerSpeed: config.flickerSpeed ?? 0,
      requiresPower,
      isEmergencyRed: isEmergency
    };
    this.fixtures.push(fixture);
    return fixture;
  }

  setPowerRestored(restored: boolean): void {
    this.powerRestored = restored;
    this.ambientLight.intensity = restored ? 1.08 : 0.82;
    this.hemiLight.intensity = restored ? 0.92 : 0.72;
    for (const f of this.fixtures) {
      if (f.requiresPower) {
        f.light.intensity = restored ? f.baseIntensity : f.baseIntensity * 0.18;
        const mat = f.bulbMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = restored ? 2.2 : 0.35;
      }
    }
  }

  setReducedFlashing(reduced: boolean): void {
    this.reducedFlashing = reduced;
  }

  triggerDisturbance(duration = 2.0): void {
    this.disturbanceTimer = Math.max(this.disturbanceTimer, duration);
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.disturbanceTimer > 0) {
      this.disturbanceTimer = Math.max(0, this.disturbanceTimer - dt);
    }

    for (let i = 0; i < this.fixtures.length; i++) {
      const f = this.fixtures[i];
      if (f.requiresPower && !this.powerRestored) {
        f.light.intensity = f.baseIntensity * 0.18;
        continue;
      }

      let multiplier = 1.0;

      if (this.disturbanceTimer > 0 && !this.reducedFlashing) {
        const wave = Math.sin(this.elapsed * 26 + i * 2.1);
        multiplier *= wave > 0 ? 0.32 : 1.15;
      } else if (f.flickerSpeed > 0 && !this.reducedFlashing) {
        const wave =
          Math.sin(this.elapsed * f.flickerSpeed + i) *
          Math.cos(this.elapsed * (f.flickerSpeed * 0.37) + i * 1.3);
        if (wave > 0.76) {
          multiplier *= 0.48;
        }
      } else if (f.isEmergencyRed) {
        const pulse = this.reducedFlashing
          ? 0.92
          : 0.78 + 0.22 * Math.sin(this.elapsed * 2.4 + i);
        multiplier *= pulse;
      }

      f.light.intensity = f.baseIntensity * multiplier;
      const mat = f.bulbMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.9 * multiplier;
    }
  }
}
