import * as THREE from 'three';
import { AssetManager } from '../game/AssetManager';
import { Collectible } from '../interaction/Collectible';
import { ComputerTerminal } from '../interaction/ComputerTerminal';
import { HidingSpot } from '../interaction/HidingSpot';
import { Interactable } from '../interaction/Interactable';
import { InteractionManager } from '../interaction/InteractionManager';
import { STORY_DOCUMENTS, TERMINAL_DATA } from '../story/Documents';
import { EventBus } from '../utils/EventBus';
import { CollisionWorld } from './CollisionWorld';
import { Door } from './Door';
import { EnvironmentBuilder } from './Environment';
import { Lighting } from './Lighting';
import { NavigationGraph } from './NavigationGraph';
import { Room, RoomSpec } from './Room';

export interface LevelBuildCallbacks {
  hasItem: (itemId: string) => boolean;
  isPowerRestored: () => boolean;
  isSecurityUnlocked: () => boolean;
  isExitReady: () => boolean;
  onCollectItem: (collectible: Collectible) => void;
  onReadDocument: (docId: string) => void;
  onAccessTerminal: (terminal: ComputerTerminal) => void;
  onOpenPowerPuzzle: () => void;
  onOpenKeypadPuzzle: () => void;
  onOpenExitPuzzle: () => void;
  onTriggerFinalEscape: () => void;
  onToggleHiding: (spot: HidingSpot) => void;
  isPlayerHidingIn: (spotId: string) => boolean;
  onDoorUnlocked: (doorId: string) => void;
}

export class LevelBuilder {
  public readonly root = new THREE.Group();
  public readonly rooms: Map<string, Room> = new Map();
  public readonly doors: Map<string, Door> = new Map();
  public readonly collectibles: Map<string, Collectible> = new Map();
  public readonly terminals: Map<string, ComputerTerminal> = new Map();
  public readonly hidingSpots: Map<string, HidingSpot> = new Map();
  public readonly lighting: Lighting;
  private readonly env: EnvironmentBuilder;

  constructor(
    private readonly assets: AssetManager,
    private readonly collisionWorld: CollisionWorld,
    private readonly navGraph: NavigationGraph,
    private readonly interactionManager: InteractionManager,
    private readonly events: EventBus
  ) {
    this.lighting = new Lighting(this.assets);
    this.env = new EnvironmentBuilder(this.assets, this.collisionWorld);
    this.root.add(this.lighting.group);
  }

  buildFacility(callbacks: LevelBuildCallbacks): void {
    this.buildRooms();
    this.buildNavigationGraph();
    this.buildDoors(callbacks);
    this.buildLighting();
    this.buildEnvironmentAndInteractables(callbacks);
  }

  private buildRooms(): void {
    const specs: RoomSpec[] = [
      // 1. Reception and Security Desk
      {
        id: 'reception',
        name: 'Reception & Security Desk',
        centerX: 0,
        centerZ: 1,
        width: 10,
        depth: 10,
        floorMaterial: 'floor_tile',
        wallMaterial: 'wall_plaster',
        northOpenings: [{ offset: 0, width: 2.2 }]
      },
      // 2. Main Corridor
      {
        id: 'main_corridor',
        name: 'Main Corridor',
        centerX: 0,
        centerZ: -19,
        width: 6,
        depth: 30,
        floorMaterial: 'floor_tile',
        wallMaterial: 'wall_plaster',
        southOpenings: [{ offset: 0, width: 6.0, height: 3.4 }],
        northOpenings: [{ offset: 0, width: 6.0, height: 3.4 }],
        westOpenings: [
          { offset: -11, width: 2.2 }, // z = -30 (Security Office)
          { offset: -1, width: 2.2 },  // z = -20 (Research Lab)
          { offset: 9, width: 2.2 }    // z = -10 (Medical Exam Room)
        ],
        eastOpenings: [
          { offset: -3, width: 2.2 },  // z = -22 (Basement Service Corridor)
          { offset: 9, width: 2.2 }    // z = -10 (Storage Room)
        ]
      },
      // 3. Medical Examination Room
      {
        id: 'exam_room',
        name: 'Medical Examination Room',
        centerX: -8,
        centerZ: -10,
        width: 10,
        depth: 8,
        floorMaterial: 'floor_tile',
        wallMaterial: 'wall_plaster',
        eastOpenings: [{ offset: 0, width: 8.0, height: 3.4 }]
      },
      // 4. Storage Room
      {
        id: 'storage_room',
        name: 'Storage Room',
        centerX: 8,
        centerZ: -10,
        width: 10,
        depth: 8,
        floorMaterial: 'floor_industrial',
        wallMaterial: 'wall_concrete',
        westOpenings: [{ offset: 0, width: 8.0, height: 3.4 }]
      },
      // 5. Basement Service Corridor
      {
        id: 'basement_corridor',
        name: 'Basement Service Corridor',
        centerX: 8.5,
        centerZ: -22,
        width: 11,
        depth: 5,
        floorMaterial: 'floor_industrial',
        wallMaterial: 'wall_concrete',
        westOpenings: [{ offset: 0, width: 5.0, height: 3.4 }],
        eastOpenings: [{ offset: 0, width: 5.0, height: 3.4 }]
      },
      // 6. Electrical Maintenance Room
      {
        id: 'electrical_room',
        name: 'Electrical Maintenance Room',
        centerX: 18.5,
        centerZ: -22,
        width: 9,
        depth: 9,
        floorMaterial: 'floor_industrial',
        wallMaterial: 'wall_concrete',
        westOpenings: [{ offset: 0, width: 2.2 }]
      },
      // 7. Research Laboratory
      {
        id: 'research_lab',
        name: 'Research Laboratory',
        centerX: -9,
        centerZ: -20,
        width: 12,
        depth: 9,
        floorMaterial: 'floor_tile',
        wallMaterial: 'wall_plaster',
        eastOpenings: [{ offset: 0, width: 9.0, height: 3.4 }]
      },
      // 8. Security Office
      {
        id: 'security_office',
        name: 'Security Office',
        centerX: -7.5,
        centerZ: -30,
        width: 9,
        depth: 7,
        floorMaterial: 'floor_tile',
        wallMaterial: 'wall_plaster',
        eastOpenings: [{ offset: 0, width: 7.0, height: 3.4 }]
      },
      // 9. Final Exit Area
      {
        id: 'exit_area',
        name: 'Final Quarantine Exit Area',
        centerX: 0,
        centerZ: -38.5,
        width: 8,
        depth: 9,
        floorMaterial: 'floor_industrial',
        wallMaterial: 'wall_concrete',
        southOpenings: [{ offset: 0, width: 2.2 }]
      }
    ];

    for (const spec of specs) {
      const room = new Room(spec, this.assets, this.collisionWorld);
      this.rooms.set(spec.id, room);
      this.root.add(room.group);
    }
  }

  private buildNavigationGraph(): void {
    this.navGraph.addNode('nav_reception', 0, 1.5, 'reception', false);
    this.navGraph.addNode('nav_corridor_south', 0, -6, 'main_corridor', true);
    this.navGraph.addNode('nav_corridor_mid_south', 0, -10, 'main_corridor', true);
    this.navGraph.addNode('nav_corridor_center', 0, -16, 'main_corridor', true);
    this.navGraph.addNode('nav_corridor_mid_north', 0, -21, 'main_corridor', true);
    this.navGraph.addNode('nav_corridor_north', 0, -30, 'main_corridor', true);

    this.navGraph.addNode('nav_exam_entry', -5.2, -10, 'exam_room', true);
    this.navGraph.addNode('nav_exam_deep', -10.2, -10, 'exam_room', true);

    this.navGraph.addNode('nav_storage_entry', 5.5, -10, 'storage_room', true);
    this.navGraph.addNode('nav_storage_deep', 10.2, -10, 'storage_room', true);

    this.navGraph.addNode('nav_basement_mid', 8.5, -22, 'basement_corridor', true);
    this.navGraph.addNode('nav_electrical_center', 17.5, -22, 'electrical_room', true);

    this.navGraph.addNode('nav_lab_entry', -5.8, -20, 'research_lab', true);
    this.navGraph.addNode('nav_lab_deep', -11.5, -20, 'research_lab', true);

    this.navGraph.addNode('nav_security_center', -6.8, -30, 'security_office', false);
    this.navGraph.addNode('nav_exit_center', 0, -37.5, 'exit_area', false);

    // Connect spine
    this.navGraph.connect('nav_reception', 'nav_corridor_south');
    this.navGraph.connect('nav_corridor_south', 'nav_corridor_mid_south');
    this.navGraph.connect('nav_corridor_mid_south', 'nav_corridor_center');
    this.navGraph.connect('nav_corridor_center', 'nav_corridor_mid_north');
    this.navGraph.connect('nav_corridor_mid_north', 'nav_corridor_north');
    this.navGraph.connect('nav_corridor_north', 'nav_exit_center');

    // Connect branches
    this.navGraph.connect('nav_corridor_mid_south', 'nav_exam_entry');
    this.navGraph.connect('nav_exam_entry', 'nav_exam_deep');

    this.navGraph.connect('nav_corridor_mid_south', 'nav_storage_entry');
    this.navGraph.connect('nav_storage_entry', 'nav_storage_deep');

    this.navGraph.connect('nav_corridor_mid_north', 'nav_basement_mid');
    this.navGraph.connect('nav_basement_mid', 'nav_electrical_center');

    this.navGraph.connect('nav_corridor_mid_north', 'nav_lab_entry');
    this.navGraph.connect('nav_lab_entry', 'nav_lab_deep');

    this.navGraph.connect('nav_corridor_north', 'nav_security_center');
  }

  private buildDoors(callbacks: LevelBuildCallbacks): void {
    const addDoor = (door: Door) => {
      this.doors.set(door.id, door);
      this.root.add(door.mesh);
      this.interactionManager.register(door);
    };

    // Reception -> Main Corridor
    addDoor(
      new Door(
        {
          id: 'door_reception',
          name: 'Reception Security Door',
          position: new THREE.Vector3(0, 0, -4),
          axis: 'x',
          locked: false
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Medical Examination Room
    addDoor(
      new Door(
        {
          id: 'door_exam',
          name: 'Medical Exam Room Door',
          position: new THREE.Vector3(-3, 0, -10),
          axis: 'z',
          locked: false
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Storage Room
    addDoor(
      new Door(
        {
          id: 'door_storage',
          name: 'East Storage Door',
          position: new THREE.Vector3(3, 0, -10),
          axis: 'z',
          locked: false
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Basement Service Corridor (Requires Maintenance Key)
    addDoor(
      new Door(
        {
          id: 'door_basement',
          name: 'Basement Service Door',
          position: new THREE.Vector3(3, 0, -22),
          axis: 'z',
          locked: true,
          requiredItemId: 'maintenance_key',
          requiredItemName: 'Requires Maintenance Key',
          lockReason: 'Locked — Locate the Maintenance Key in the Medical Examination Room.',
          canUnlockCheck: () => {
            if (callbacks.hasItem('maintenance_key')) {
              return { allowed: true };
            }
            return {
              allowed: false,
              reason: 'Locked — Requires Maintenance Key (Medical Examination Room).'
            };
          },
          onUnlock: (d) => {
            callbacks.onDoorUnlocked(d.id);
            this.events.emit('notification:show', {
              text: 'Unlocked Basement Service Door with Maintenance Key.',
              tone: 'success'
            });
          },
          onAttemptLocked: (_d, reason) => {
            this.events.emit('notification:show', { text: reason, tone: 'warning' });
          }
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Basement Service Corridor -> Electrical Maintenance Room
    addDoor(
      new Door(
        {
          id: 'door_electrical',
          name: 'Electrical Substation Door',
          position: new THREE.Vector3(14, 0, -22),
          axis: 'z',
          locked: false
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Research Laboratory (Unlocks when Backup Power is restored)
    addDoor(
      new Door(
        {
          id: 'door_lab',
          name: 'Research Laboratory Containment Door',
          position: new THREE.Vector3(-3, 0, -20),
          axis: 'z',
          locked: true,
          lockReason: 'Electromagnetic Lock Engaged — Restore 120V Backup Power in Electrical Room.',
          canUnlockCheck: () => {
            if (callbacks.isPowerRestored()) {
              return { allowed: true };
            }
            return {
              allowed: false,
              reason: 'Mag-Lock Offline — Restore 120V Backup Power in the Electrical Maintenance Room first.'
            };
          },
          onUnlock: (d) => {
            callbacks.onDoorUnlocked(d.id);
          },
          onAttemptLocked: (_d, reason) => {
            this.events.emit('notification:show', { text: reason, tone: 'warning' });
          }
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Security Office (Gated by Security Keypad Puzzle B)
    addDoor(
      new Door(
        {
          id: 'door_security',
          name: 'Security Office Armored Door',
          position: new THREE.Vector3(-3, 0, -30),
          axis: 'z',
          locked: true,
          lockReason: 'Keypad Locked — Use Security Keypad beside door (PIN 2413).',
          canUnlockCheck: () => {
            if (callbacks.isSecurityUnlocked()) {
              return { allowed: true };
            }
            callbacks.onOpenKeypadPuzzle();
            return {
              allowed: false,
              reason: 'Enter 4-digit PIN on the Security Keypad.'
            };
          },
          onUnlock: (d) => {
            callbacks.onDoorUnlocked(d.id);
          }
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );

    // Main Corridor -> Final Exit Area
    addDoor(
      new Door(
        {
          id: 'door_exit_vestibule',
          name: 'North Airlock Vestibule Door',
          position: new THREE.Vector3(0, 0, -34),
          axis: 'x',
          locked: false
        },
        this.assets,
        this.collisionWorld,
        this.events
      )
    );
  }

  private buildLighting(): void {
    // Reception emergency & desk light
    this.lighting.addFixture({
      id: 'light_reception_main',
      x: 0,
      z: 1,
      color: 0xff3b30,
      intensity: 1.4,
      distance: 13,
      isEmergencyRed: true
    });
    this.lighting.addFixture({
      id: 'light_reception_desk',
      x: -2.2,
      y: 2.6,
      z: -1.5,
      color: 0x99d6ea,
      intensity: 1.2,
      distance: 8
    });

    // Main corridor emergency & fluorescent lights
    this.lighting.addFixture({
      id: 'light_corridor_s',
      x: 0,
      z: -8,
      color: 0xff2a2a,
      intensity: 1.15,
      distance: 12,
      isEmergencyRed: true
    });
    this.lighting.addFixture({
      id: 'light_corridor_m',
      x: 0,
      z: -18,
      color: 0xb0d8e8,
      intensity: 1.6,
      distance: 14,
      flickerSpeed: 7.5,
      requiresPower: true
    });
    this.lighting.addFixture({
      id: 'light_corridor_n',
      x: 0,
      z: -29,
      color: 0xff2a2a,
      intensity: 1.25,
      distance: 12,
      isEmergencyRed: true
    });

    // Medical Examination Room
    this.lighting.addFixture({
      id: 'light_exam',
      x: -8,
      z: -10,
      color: 0x88d4bc,
      intensity: 1.35,
      distance: 12,
      flickerSpeed: 6.2
    });

    // Storage Room
    this.lighting.addFixture({
      id: 'light_storage',
      x: 8,
      z: -10,
      color: 0xffaa44,
      intensity: 1.2,
      distance: 11,
      flickerSpeed: 4.5
    });

    // Basement Service Corridor
    this.lighting.addFixture({
      id: 'light_basement',
      x: 8.5,
      z: -22,
      color: 0xff2e2e,
      intensity: 1.1,
      distance: 11,
      isEmergencyRed: true
    });

    // Electrical Room
    this.lighting.addFixture({
      id: 'light_electrical',
      x: 18.5,
      z: -22,
      color: 0xffaa33,
      intensity: 1.5,
      distance: 12
    });

    // Research Laboratory
    this.lighting.addFixture({
      id: 'light_lab_emergency',
      x: -7,
      z: -20,
      color: 0xff2a2a,
      intensity: 1.0,
      distance: 11,
      isEmergencyRed: true
    });
    this.lighting.addFixture({
      id: 'light_lab_main',
      x: -10,
      z: -20,
      color: 0x70e4dc,
      intensity: 1.85,
      distance: 14,
      requiresPower: true
    });

    // Security Office
    this.lighting.addFixture({
      id: 'light_security',
      x: -7.5,
      z: -30,
      color: 0x7fd4ff,
      intensity: 1.6,
      distance: 11,
      requiresPower: true
    });

    // Final Exit Area
    this.lighting.addFixture({
      id: 'light_exit',
      x: 0,
      z: -38.5,
      color: 0xff2222,
      intensity: 1.65,
      distance: 13,
      isEmergencyRed: true
    });
  }

  private buildEnvironmentAndInteractables(callbacks: LevelBuildCallbacks): void {
    // Directional signs in Main Corridor
    this.root.add(
      this.env.createRoomSign('RECEPTION [SOUTH]', 0, 2.95, -4.18, 0),
      this.env.createRoomSign('MEDICAL EXAM [WEST]', -2.84, 2.95, -10, Math.PI / 2),
      this.env.createRoomSign('STORAGE [EAST]', 2.84, 2.95, -10, -Math.PI / 2),
      this.env.createRoomSign('BASEMENT & POWER [EAST]', 2.84, 2.95, -22, -Math.PI / 2),
      this.env.createRoomSign('RESEARCH LAB [WEST]', -2.84, 2.95, -20, Math.PI / 2),
      this.env.createRoomSign('SECURITY OFFICE [WEST]', -2.84, 2.95, -30, Math.PI / 2),
      this.env.createRoomSign('QUARANTINE EXIT [NORTH]', 0, 2.95, -33.82, 0)
    );

    // Overhead pipes in corridor & basement
    this.root.add(
      this.env.createOverheadPipe(-2.1, 3.1, -19, 28, 'z'),
      this.env.createOverheadPipe(2.1, 3.1, -19, 28, 'z'),
      this.env.createOverheadPipe(8.5, 3.05, -20.2, 10.5, 'x')
    );

    // --- 1. RECEPTION PROPS & ITEMS ---
    this.root.add(this.env.createDesk('prop_reception_desk', -2.0, -1.2, 2.4, 1.0, 0));
    this.registerNote('doc_reception_log', new THREE.Vector3(-1.5, 0.84, -1.1), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'pickup_battery_reception',
        name: 'Lithium Flashlight Battery',
        kind: 'battery',
        position: new THREE.Vector3(-2.6, 0.84, -1.1),
        mesh: this.env.createKeyItemMesh(-2.6, 0.84, -1.1, 'emissive_green'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );

    // --- 2. MEDICAL EXAMINATION ROOM PROPS & ITEMS ---
    this.root.add(
      this.env.createHospitalBed('prop_exam_bed_1', -7.2, -7.8, 0),
      this.env.createHospitalBed('prop_exam_bed_2', -10.5, -7.8, 0),
      this.env.createDesk('prop_exam_tray', -10.5, -11.8, 1.6, 0.8, 0)
    );
    this.registerNote('doc_exam_handover', new THREE.Vector3(-9.9, 0.84, -11.7), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'maintenance_key',
        name: 'Basement Maintenance Key',
        kind: 'key',
        position: new THREE.Vector3(-10.9, 0.84, -11.7),
        mesh: this.env.createKeyItemMesh(-10.9, 0.84, -11.7, 'emissive_amber'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerHidingSpot(
      'hide_exam_locker',
      'Medical Hazmat Locker',
      new THREE.Vector3(-5.2, 0, -13.2),
      new THREE.Vector3(-5.2, 0, -12.1),
      0,
      callbacks
    );

    // --- 3. STORAGE ROOM PROPS & ITEMS ---
    this.root.add(
      this.env.createStorageShelf('prop_storage_shelf_1', 7.5, -7.2, 2.4, 0.75, 0),
      this.env.createStorageShelf('prop_storage_shelf_2', 10.8, -12.5, 2.4, 0.75, 0),
      this.env.createDesk('prop_storage_bench', 7.2, -12.5, 1.8, 0.85, 0)
    );
    this.registerNote('doc_storage_inventory', new THREE.Vector3(6.7, 0.84, -12.4), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'replacement_fuse',
        name: '200A Replacement High-Amp Fuse',
        kind: 'fuse',
        position: new THREE.Vector3(7.6, 0.84, -12.4),
        mesh: this.env.createKeyItemMesh(7.6, 0.84, -12.4, 'emissive_cyan'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerCollectible(
      new Collectible({
        id: 'pickup_decoy_storage_1',
        name: 'Glass Acoustic Decoy Bottles (x3)',
        kind: 'decoy',
        position: new THREE.Vector3(10.5, 0.82, -12.2),
        mesh: this.env.createKeyItemMesh(10.5, 0.82, -12.2, 'emissive_amber'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerHidingSpot(
      'hide_storage_locker',
      'Storage Steel Cabinet',
      new THREE.Vector3(11.8, 0, -7.2),
      new THREE.Vector3(10.7, 0, -7.2),
      -Math.PI / 2,
      callbacks
    );

    // --- 4. MAIN CORRIDOR HIDING LOCKER & EXTRA BATTERY ---
    this.registerHidingSpot(
      'hide_corridor_locker',
      'Corridor Emergency Locker',
      new THREE.Vector3(2.2, 0, -15.5),
      new THREE.Vector3(1.1, 0, -15.5),
      -Math.PI / 2,
      callbacks
    );

    // --- 5. BASEMENT SERVICE CORRIDOR ---
    this.root.add(this.env.createDesk('prop_basement_crate', 8.5, -23.6, 1.4, 0.7, 0));
    this.registerNote('doc_basement_warning', new THREE.Vector3(8.5, 0.84, -23.5), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'pickup_battery_basement',
        name: 'Lithium Flashlight Battery',
        kind: 'battery',
        position: new THREE.Vector3(9.0, 0.84, -23.5),
        mesh: this.env.createKeyItemMesh(9.0, 0.84, -23.5, 'emissive_green'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );

    // --- 6. ELECTRICAL MAINTENANCE ROOM (PUZZLE A) ---
    this.root.add(this.env.createDesk('prop_electrical_bench', 18.5, -25.2, 2.0, 0.85, 0));
    this.registerNote('doc_electrical_schematic', new THREE.Vector3(18.2, 0.84, -25.1), callbacks);

    const powerPanelMesh = this.env.createWallPanelMesh(22.6, 1.45, -22, -Math.PI / 2, 'emissive_amber');
    this.root.add(powerPanelMesh);
    const powerPanelInteractable: Interactable = {
      id: 'puzzle_power_panel',
      position: new THREE.Vector3(22.4, 1.4, -22),
      interactionRadius: 2.9,
      mesh: powerPanelMesh,
      isEnabled: () => true,
      getPromptText: () =>
        callbacks.isPowerRestored()
          ? 'Press E to Inspect Electrical Control Panel (120V Online)'
          : 'Press E to Operate Electrical Routing Panel',
      interact: () => callbacks.onOpenPowerPuzzle()
    };
    this.interactionManager.register(powerPanelInteractable);

    // --- 7. RESEARCH LABORATORY ---
    this.root.add(
      this.env.createContainmentPod('prop_pod_08', -12.5, -17.5, false),
      this.env.createContainmentPod('prop_pod_09_shattered', -12.5, -22.2, true),
      this.env.createDesk('prop_lab_center_bench', -8.2, -20.0, 2.4, 1.0, 0)
    );
    this.registerNote('doc_lab_experiment', new THREE.Vector3(-8.8, 0.84, -19.9), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'level2_access_card',
        name: 'Level-2 Research Access Card',
        kind: 'keycard',
        position: new THREE.Vector3(-7.5, 0.84, -19.9),
        mesh: this.env.createKeyItemMesh(-7.5, 0.84, -19.9, 'emissive_cyan'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerCollectible(
      new Collectible({
        id: 'pickup_decoy_lab',
        name: 'Glass Acoustic Decoy Bottles (x2)',
        kind: 'decoy',
        position: new THREE.Vector3(-8.2, 0.84, -20.3),
        mesh: this.env.createKeyItemMesh(-8.2, 0.84, -20.3, 'emissive_amber'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerTerminal(
      'terminal_lab',
      new THREE.Vector3(-8.2, 0.82, -19.6),
      0,
      true,
      callbacks
    );
    this.registerHidingSpot(
      'hide_lab_locker',
      'Bio-Isolation Locker',
      new THREE.Vector3(-5.2, 0, -23.6),
      new THREE.Vector3(-5.2, 0, -22.5),
      0,
      callbacks
    );

    // --- 8. SECURITY OFFICE & KEYPAD (PUZZLE B) ---
    const keypadMesh = this.env.createWallPanelMesh(-2.85, 1.42, -28.4, Math.PI / 2, 'emissive_red');
    this.root.add(keypadMesh);
    const keypadInteractable: Interactable = {
      id: 'puzzle_security_keypad',
      position: new THREE.Vector3(-2.85, 1.42, -28.4),
      interactionRadius: 2.8,
      mesh: keypadMesh,
      isEnabled: () => true,
      getPromptText: () =>
        callbacks.isSecurityUnlocked()
          ? 'Press E to Inspect Security Keypad (Unlocked)'
          : 'Press E to Enter Security Office PIN',
      interact: () => callbacks.onOpenKeypadPuzzle()
    };
    this.interactionManager.register(keypadInteractable);

    this.root.add(this.env.createDesk('prop_security_desk', -8.2, -30.0, 2.4, 1.0, Math.PI / 2));
    this.registerNote('doc_security_final_reveal', new THREE.Vector3(-8.1, 0.84, -30.6), callbacks);
    this.registerCollectible(
      new Collectible({
        id: 'master_override_card',
        name: 'Master Override Keycard',
        kind: 'keycard',
        position: new THREE.Vector3(-8.1, 0.84, -29.4),
        mesh: this.env.createKeyItemMesh(-8.1, 0.84, -29.4, 'emissive_red'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerCollectible(
      new Collectible({
        id: 'pickup_battery_security',
        name: 'Lithium Flashlight Battery',
        kind: 'battery',
        position: new THREE.Vector3(-8.1, 0.84, -30.9),
        mesh: this.env.createKeyItemMesh(-8.1, 0.84, -30.9, 'emissive_green'),
        onCollect: (c) => callbacks.onCollectItem(c)
      })
    );
    this.registerTerminal(
      'terminal_security',
      new THREE.Vector3(-8.3, 0.82, -30.0),
      Math.PI / 2,
      true,
      callbacks
    );

    // --- 9. FINAL EXIT AREA (PUZZLE C) ---
    const exitConsoleMesh = this.env.createWallPanelMesh(-1.9, 1.4, -42.5, 0, 'emissive_cyan');
    this.root.add(exitConsoleMesh);
    const exitConsoleInteractable: Interactable = {
      id: 'puzzle_exit_console',
      position: new THREE.Vector3(-1.9, 1.4, -42.5),
      interactionRadius: 2.9,
      mesh: exitConsoleMesh,
      isEnabled: () => true,
      getPromptText: () =>
        callbacks.isExitReady()
          ? 'Press E to Inspect Quarantine Airlock Console (Purge Complete)'
          : 'Press E to Operate Quarantine Airlock Override Console',
      interact: () => callbacks.onOpenExitPuzzle()
    };
    this.interactionManager.register(exitConsoleInteractable);

    const escapeHatchMesh = this.env.createWallPanelMesh(0, 1.5, -42.7, 0, 'emissive_green');
    escapeHatchMesh.scale.set(2.4, 2.2, 1.2);
    this.root.add(escapeHatchMesh);
    const escapeHatchInteractable: Interactable = {
      id: 'final_escape_hatch',
      position: new THREE.Vector3(0, 1.4, -42.5),
      interactionRadius: 3.1,
      mesh: escapeHatchMesh,
      isEnabled: () => true,
      getPromptText: () =>
        callbacks.isExitReady()
          ? 'Press E to Evacuate Facility Through Quarantine Airlock'
          : 'Press E to Inspect Exterior Quarantine Blast Door (Locked — Use Console)',
      interact: () => {
        if (callbacks.isExitReady()) {
          callbacks.onTriggerFinalEscape();
        } else {
          callbacks.onOpenExitPuzzle();
        }
      }
    };
    this.interactionManager.register(escapeHatchInteractable);
  }

  private registerCollectible(collectible: Collectible): void {
    this.collectibles.set(collectible.id, collectible);
    this.root.add(collectible.mesh);
    this.interactionManager.register(collectible);
  }

  private registerNote(
    docId: string,
    position: THREE.Vector3,
    callbacks: LevelBuildCallbacks
  ): void {
    const doc = STORY_DOCUMENTS.find((d) => d.id === docId);
    if (!doc) return;
    const mesh = this.env.createNoteMesh(position.x, position.y, position.z);
    const collectible = new Collectible({
      id: docId,
      name: doc.title,
      kind: 'note',
      position,
      mesh,
      reusable: true,
      onCollect: () => callbacks.onReadDocument(docId)
    });
    this.registerCollectible(collectible);
  }

  private registerTerminal(
    terminalId: string,
    position: THREE.Vector3,
    rotY: number,
    requiresPower: boolean,
    callbacks: LevelBuildCallbacks
  ): void {
    const data = TERMINAL_DATA[terminalId];
    if (!data) return;
    const mesh = this.env.createTerminalMesh(position.x, position.y, position.z, rotY);
    this.root.add(mesh);
    const terminal = new ComputerTerminal({
      id: terminalId,
      name: data.name,
      position,
      mesh,
      entries: data.entries,
      requiresPower,
      isPowerActive: () => callbacks.isPowerRestored(),
      onAccess: (t) => callbacks.onAccessTerminal(t)
    });
    this.terminals.set(terminalId, terminal);
    this.interactionManager.register(terminal);
  }

  private registerHidingSpot(
    id: string,
    label: string,
    lockerPos: THREE.Vector3,
    exitPos: THREE.Vector3,
    rotY: number,
    callbacks: LevelBuildCallbacks
  ): void {
    const mesh = this.env.createHidingLockerMesh(lockerPos.x, lockerPos.z, rotY);
    this.root.add(mesh);
    const spot = new HidingSpot({
      id,
      label,
      position: lockerPos.clone().setY(1.1),
      hidePosition: lockerPos.clone(),
      exitPosition: exitPos.clone(),
      exitYaw: rotY,
      mesh,
      onToggleHide: (s) => callbacks.onToggleHiding(s),
      isPlayerHidingHere: () => callbacks.isPlayerHidingIn(id)
    });
    this.hidingSpots.set(id, spot);
    this.interactionManager.register(spot);
  }

  update(dt: number): void {
    this.lighting.update(dt);
    for (const door of this.doors.values()) {
      door.update(dt);
    }
  }
}
