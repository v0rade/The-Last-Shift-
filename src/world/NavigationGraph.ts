import * as THREE from 'three';

export interface NavNode {
  id: string;
  position: THREE.Vector3;
  neighbors: string[];
  roomId: string;
  isPatrolPoint: boolean;
}

export class NavigationGraph {
  private nodes: Map<string, NavNode> = new Map();

  addNode(
    id: string,
    x: number,
    z: number,
    roomId: string,
    isPatrolPoint = true
  ): NavNode {
    const node: NavNode = {
      id,
      position: new THREE.Vector3(x, 0, z),
      neighbors: [],
      roomId,
      isPatrolPoint
    };
    this.nodes.set(id, node);
    return node;
  }

  connect(idA: string, idB: string): void {
    const a = this.nodes.get(idA);
    const b = this.nodes.get(idB);
    if (!a || !b) return;
    if (!a.neighbors.includes(idB)) a.neighbors.push(idB);
    if (!b.neighbors.includes(idA)) b.neighbors.push(idA);
  }

  getNode(id: string): NavNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): NavNode[] {
    return Array.from(this.nodes.values());
  }

  getPatrolNodes(): NavNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.isPatrolPoint);
  }

  getNearestNode(pos: THREE.Vector3): NavNode | null {
    let best: NavNode | null = null;
    let bestDistSq = Infinity;
    for (const node of this.nodes.values()) {
      const dx = node.position.x - pos.x;
      const dz = node.position.z - pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = node;
      }
    }
    return best;
  }

  getFarthestPatrolNode(fromPos: THREE.Vector3): NavNode | null {
    let best: NavNode | null = null;
    let bestDistSq = -1;
    for (const node of this.nodes.values()) {
      if (!node.isPatrolPoint) continue;
      const dx = node.position.x - fromPos.x;
      const dz = node.position.z - fromPos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > bestDistSq) {
        bestDistSq = dSq;
        best = node;
      }
    }
    return best;
  }

  findPath(fromPos: THREE.Vector3, toPos: THREE.Vector3): THREE.Vector3[] {
    const startNode = this.getNearestNode(fromPos);
    const endNode = this.getNearestNode(toPos);

    if (!startNode || !endNode) {
      return [toPos.clone()];
    }
    if (startNode.id === endNode.id) {
      return [toPos.clone()];
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const id of this.nodes.keys()) {
      dist.set(id, Infinity);
      prev.set(id, null);
      unvisited.add(id);
    }
    dist.set(startNode.id, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let smallestDist = Infinity;

      for (const id of unvisited) {
        const d = dist.get(id) ?? Infinity;
        if (d < smallestDist) {
          smallestDist = d;
          currentId = id;
        }
      }

      if (currentId === null || currentId === endNode.id || smallestDist === Infinity) {
        break;
      }

      unvisited.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;

      for (const neighborId of currentNode.neighbors) {
        if (!unvisited.has(neighborId)) continue;
        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const edgeCost = currentNode.position.distanceTo(neighborNode.position);
        const alt = smallestDist + edgeCost;
        if (alt < (dist.get(neighborId) ?? Infinity)) {
          dist.set(neighborId, alt);
          prev.set(neighborId, currentId);
        }
      }
    }

    const path: THREE.Vector3[] = [];
    let curr: string | null = endNode.id;
    while (curr !== null) {
      const node = this.nodes.get(curr);
      if (node) {
        path.unshift(node.position.clone());
      }
      curr = prev.get(curr) ?? null;
    }

    path.push(toPos.clone());
    return path;
  }

  clear(): void {
    this.nodes.clear();
  }
}
