import * as THREE from 'three';
import { EventBus } from '../utils/EventBus';
import { CollisionWorld } from '../world/CollisionWorld';
import { NavigationGraph } from '../world/NavigationGraph';
import { MonsterAI } from './MonsterAI';
import { MonsterNavigation } from './MonsterNavigation';
import { MonsterPerception, PlayerPerceptionState } from './MonsterPerception';

export class Monster {
  public readonly group = new THREE.Group();
  public readonly ai: MonsterAI;

  private torsoGroup = new THREE.Group();
  private headGroup = new THREE.Group();
  private leftArm = new THREE.Group();
  private rightArm = new THREE.Group();
  private leftLeg = new THREE.Group();
  private rightLeg = new THREE.Group();
  private eyeLight: THREE.PointLight;
  private animClock = 0;

  constructor(
    navGraph: NavigationGraph,
    collisionWorld: CollisionWorld,
    events: EventBus
  ) {
    const perception = new MonsterPerception(collisionWorld);
    const navigation = new MonsterNavigation(navGraph, collisionWorld);
    this.ai = new MonsterAI(perception, navigation, navGraph, events);

    this.eyeLight = new THREE.PointLight(0xff1e1e, 1.3, 6.5, 1.8);
    this.buildCreatureModel();
    this.group.visible = false;
  }

  private buildCreatureModel(): void {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x16191d,
      roughness: 0.55,
      metalness: 0.25
    });

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x2e2a27,
      roughness: 0.65,
      metalness: 0.35
    });

    const receptorMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1111,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });

    // Pelvis & Spine
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), skinMat);
    pelvis.position.set(0, 0.98, 0);
    this.group.add(pelvis);

    this.torsoGroup.position.set(0, 1.1, 0);
    this.group.add(this.torsoGroup);

    const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.19, 0.72, 8), skinMat);
    thorax.position.set(0, 0.36, 0.05);
    thorax.rotation.x = 0.22; // Hunched posture
    this.torsoGroup.add(thorax);

    // Protruding dorsal acoustic fins / ribs
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.56 - i * 0.05, 0.05, 0.12), boneMat);
      rib.position.set(0, 0.18 + i * 0.14, -0.06);
      this.torsoGroup.add(rib);
    }

    // Head & Bio-acoustic Receptor Crown
    this.headGroup.position.set(0, 0.78, 0.18);
    this.torsoGroup.add(this.headGroup);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.34), boneMat);
    this.headGroup.add(skull);

    const acousticDish = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.1, 0.14, 10), skinMat);
    acousticDish.rotation.x = Math.PI / 2;
    acousticDish.position.set(0, 0.04, 0.16);
    this.headGroup.add(acousticDish);

    // Glowing sensory nodes
    const leftSensor = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), receptorMat);
    leftSensor.position.set(-0.08, 0.05, 0.22);
    const rightSensor = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), receptorMat);
    rightSensor.position.set(0.08, 0.05, 0.22);
    const centerSensor = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), receptorMat);
    centerSensor.position.set(0, 0.14, 0.2);
    this.headGroup.add(leftSensor, rightSensor, centerSensor);

    this.eyeLight.position.set(0, 0.1, 0.35);
    this.headGroup.add(this.eyeLight);

    // Elongated Left & Right Arms
    this.leftArm.position.set(-0.34, 0.64, 0.08);
    this.rightArm.position.set(0.34, 0.64, 0.08);
    this.torsoGroup.add(this.leftArm, this.rightArm);

    const upperArmGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.56, 7);
    const foreArmGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.62, 7);

    const lUpper = new THREE.Mesh(upperArmGeo, skinMat);
    lUpper.position.set(0, -0.26, 0);
    const lFore = new THREE.Mesh(foreArmGeo, boneMat);
    lFore.position.set(0, -0.78, 0.1);
    lFore.rotation.x = -0.35;
    this.leftArm.add(lUpper, lFore);

    const rUpper = new THREE.Mesh(upperArmGeo, skinMat);
    rUpper.position.set(0, -0.26, 0);
    const rFore = new THREE.Mesh(foreArmGeo, boneMat);
    rFore.position.set(0, -0.78, 0.1);
    rFore.rotation.x = -0.35;
    this.rightArm.add(rUpper, rFore);

    // Legs
    this.leftLeg.position.set(-0.16, 0.96, 0);
    this.rightLeg.position.set(0.16, 0.96, 0);
    this.group.add(this.leftLeg, this.rightLeg);

    const legGeo = new THREE.CylinderGeometry(0.085, 0.05, 0.96, 7);
    const lLegMesh = new THREE.Mesh(legGeo, skinMat);
    lLegMesh.position.set(0, -0.48, 0);
    const rLegMesh = new THREE.Mesh(legGeo, skinMat);
    rLegMesh.position.set(0, -0.48, 0);
    this.leftLeg.add(lLegMesh);
    this.rightLeg.add(rLegMesh);
  }

  activate(spawnPos: THREE.Vector3): void {
    this.ai.setActive(true, spawnPos);
    this.group.position.copy(spawnPos);
    this.group.visible = true;
  }

  deactivate(): void {
    this.ai.setActive(false);
    this.group.visible = false;
  }

  update(dt: number, player: PlayerPerceptionState): void {
    if (!this.ai.isActive()) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.ai.update(dt, player);

    this.group.position.copy(this.ai.position);
    this.group.rotation.y = this.ai.getHeadingYaw();

    const state = this.ai.getState();
    const speedFactor =
      state === 'CHASE'
        ? 11.5
        : state === 'INVESTIGATE' || state === 'SEARCH'
          ? 7.5
          : state === 'PATROL'
            ? 5.5
            : 2.0;

    this.animClock += dt * speedFactor;

    const swing = state === 'IDLE' ? 0.05 : 0.48;
    this.leftLeg.rotation.x = Math.sin(this.animClock) * swing;
    this.rightLeg.rotation.x = -Math.sin(this.animClock) * swing;
    this.leftArm.rotation.x = -Math.sin(this.animClock) * (swing * 1.1) - 0.3;
    this.rightArm.rotation.x = Math.sin(this.animClock) * (swing * 1.1) - 0.3;

    // Unsettling head twitch & acoustic scanning
    this.headGroup.rotation.z = Math.sin(this.animClock * 1.7) * 0.18;
    this.headGroup.rotation.y = Math.cos(this.animClock * 0.9) * 0.25;
    this.torsoGroup.position.y = 1.1 + Math.abs(Math.sin(this.animClock)) * 0.05;

    this.eyeLight.intensity = state === 'CHASE' ? 2.4 : 1.1;
  }
}
