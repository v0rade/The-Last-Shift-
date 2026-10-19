import * as THREE from 'three';
import { EventBus } from '../utils/EventBus';

export interface ScriptedScareZone {
  id: string;
  position: THREE.Vector3;
  radius: number;
  type: 'light_flicker' | 'vent_impact' | 'distant_silhouette' | 'radio_whisper' | 'containment_breach';
  subtitle: string;
  requiresPowerRestored?: boolean;
}

export const SCRIPTED_SCARE_ZONES: ScriptedScareZone[] = [
  {
    id: 'scare_corridor_first_entry',
    position: new THREE.Vector3(0, 0, -10),
    radius: 3.4,
    type: 'light_flicker',
    subtitle: '[INTERCOM STATIC]: "...Substation B offline... biomedical containment integrity at 14%..."'
  },
  {
    id: 'scare_exam_room_tray',
    position: new THREE.Vector3(-12, 0, -10),
    radius: 3.8,
    type: 'vent_impact',
    subtitle: '[METALLIC THUD ABOVE]: Something heavy shifts inside the examination room ceiling duct.'
  },
  {
    id: 'scare_basement_pipe_burst',
    position: new THREE.Vector3(12, 0, -20),
    radius: 3.6,
    type: 'distant_silhouette',
    subtitle: '[DISTANT SCRAPING]: Claws rake across the steel conduit ahead before vanishing into the dark.'
  },
  {
    id: 'scare_lab_pod_shatter',
    position: new THREE.Vector3(-13, 0, -22),
    radius: 4.0,
    type: 'containment_breach',
    requiresPowerRestored: true,
    subtitle: '[ACOUSTIC SPIKE]: Specimen Pod 09 resonates violently—your flashlight beam wavers.'
  },
  {
    id: 'scare_security_radio',
    position: new THREE.Vector3(-10, 0, -33),
    radius: 3.5,
    type: 'radio_whisper',
    requiresPowerRestored: true,
    subtitle: '[MERCER RADIO RECORDING]: "Don\'t let it hear you sprint down the north hall... use the lockers..."'
  }
];

export class ScareDirector {
  private triggeredIds: Set<string> = new Set();

  constructor(private readonly events: EventBus) {}

  update(playerPosition: THREE.Vector3, powerRestored: boolean): void {
    for (const zone of SCRIPTED_SCARE_ZONES) {
      if (this.triggeredIds.has(zone.id)) continue;
      if (zone.requiresPowerRestored && !powerRestored) continue;

      const dist = playerPosition.distanceTo(zone.position);
      if (dist <= zone.radius) {
        this.triggerEvent(zone.id, zone.type, zone.subtitle);
      }
    }
  }

  triggerEvent(id: string, type: string, subtitle?: string): boolean {
    if (this.triggeredIds.has(id)) return false;
    this.triggeredIds.add(id);

    this.events.emit('scare:triggered', {
      id,
      type,
      subtitle,
      duration: 2.2
    });

    if (subtitle) {
      this.events.emit('subtitle:show', {
        text: subtitle,
        duration: 5.5
      });
    }
    return true;
  }

  hasTriggered(id: string): boolean {
    return this.triggeredIds.has(id);
  }

  getTriggeredIds(): string[] {
    return Array.from(this.triggeredIds);
  }

  restoreState(ids: string[]): void {
    this.triggeredIds = new Set(ids);
  }

  reset(): void {
    this.triggeredIds.clear();
  }
}
