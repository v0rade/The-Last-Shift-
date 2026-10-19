export type EventMap = {
  'state:changed': { from: string; to: string };
  'objective:updated': { id: string; title: string; description: string; stepIndex: number };
  'inventory:added': { id: string; name: string; category: string };
  'inventory:used': { id: string; name: string };
  'inventory:updated': { items: Array<{ id: string; name: string; category: string; count: number }> };
  'document:read': { id: string; title: string };
  'terminal:opened': { id: string };
  'puzzle:opened': { type: 'power' | 'keypad' | 'exit'; id: string };
  'puzzle:solved': { type: 'power' | 'keypad' | 'exit'; id: string };
  'door:state': { id: string; isOpen: boolean; locked: boolean; message?: string };
  'player:noise': { x: number; y: number; z: number; radius: number; source: 'walk' | 'sprint' | 'crouch' | 'decoy' | 'interaction' };
  'player:hiding': { isHiding: boolean; spotId: string | null };
  'player:flashlight': { enabled: boolean; battery: number; malfunctioning: boolean };
  'player:stamina': { stamina: number; maxStamina: number; exhausted: boolean };
  'player:distraction_thrown': { x: number; z: number; remaining: number };
  'monster:state': { state: string; prevState: string; distanceToPlayer: number };
  'monster:attack': { reason: string };
  'scare:triggered': { id: string; type: string; subtitle?: string; duration?: number };
  'subtitle:show': { text: string; speaker?: string; duration?: number };
  'notification:show': { text: string; tone?: 'info' | 'warning' | 'danger' | 'success' };
  'checkpoint:saved': { checkpointId: string; timestamp: number };
  'settings:changed': Record<string, unknown>;
  'power:restored': { level: 'partial' | 'full' };
};

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners: Map<keyof EventMap, Set<Handler<any>>> = new Map();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
