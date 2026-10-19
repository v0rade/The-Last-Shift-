import { EventBus } from '../utils/EventBus';

export type InventoryCategory = 'key' | 'keycard' | 'fuse' | 'decoy' | 'misc';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  count: number;
  stackable?: boolean;
}

export class PlayerInventory {
  private items: Map<string, InventoryItem> = new Map();

  constructor(private readonly events: EventBus) {}

  addItem(item: {
    id: string;
    name: string;
    category: InventoryCategory;
    count?: number;
    stackable?: boolean;
  }): boolean {
    const qty = item.count ?? 1;
    const existing = this.items.get(item.id);

    if (existing) {
      if (!existing.stackable && item.category !== 'decoy') {
        return false;
      }
      existing.count += qty;
    } else {
      this.items.set(item.id, {
        id: item.id,
        name: item.name,
        category: item.category,
        count: qty,
        stackable: item.stackable ?? item.category === 'decoy'
      });
    }

    this.events.emit('inventory:added', {
      id: item.id,
      name: item.name,
      category: item.category
    });
    this.emitUpdated();
    return true;
  }

  hasItem(id: string): boolean {
    const item = this.items.get(id);
    return Boolean(item && item.count > 0);
  }

  getItemCount(id: string): number {
    return this.items.get(id)?.count ?? 0;
  }

  consumeItem(id: string, amount = 1): boolean {
    const item = this.items.get(id);
    if (!item || item.count < amount) return false;

    item.count -= amount;
    const name = item.name;
    if (item.count <= 0) {
      this.items.delete(id);
    }

    this.events.emit('inventory:used', { id, name });
    this.emitUpdated();
    return true;
  }

  getAllItems(): InventoryItem[] {
    return Array.from(this.items.values()).map((it) => ({ ...it }));
  }

  restoreItems(saved: Array<{ id: string; name: string; category: InventoryCategory; count: number }>): void {
    this.items.clear();
    for (const entry of saved) {
      if (entry.count > 0) {
        this.items.set(entry.id, {
          id: entry.id,
          name: entry.name,
          category: entry.category,
          count: entry.count,
          stackable: entry.category === 'decoy'
        });
      }
    }
    this.emitUpdated();
  }

  clear(): void {
    this.items.clear();
    this.emitUpdated();
  }

  private emitUpdated(): void {
    this.events.emit('inventory:updated', {
      items: this.getAllItems()
    });
  }
}
