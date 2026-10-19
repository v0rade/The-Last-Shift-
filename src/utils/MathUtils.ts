export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * this.clamp(t, 0, 1);
  }

  static damp(current: number, target: number, lambda: number, dt: number): number {
    return this.lerp(current, target, 1 - Math.exp(-lambda * dt));
  }

  static distance2D(x1: number, z1: number, x2: number, z2: number): number {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.hypot(dx, dz);
  }

  static distance3D(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.hypot(dx, dy, dz);
  }

  static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  static angleBetween2D(fromX: number, fromZ: number, toX: number, toZ: number): number {
    return Math.atan2(toX - fromX, toZ - fromZ);
  }
}
