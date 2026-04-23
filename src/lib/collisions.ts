import type { Rect } from "@/lib/content";

export type Point = {
  x: number;
  y: number;
};

export function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function isBlocked(player: Rect, collisions: Rect[]) {
  return collisions.some((collision) => rectsOverlap(player, collision));
}

export function clampPoint(point: Point, bounds: { width: number; height: number }, playerSize: number) {
  return {
    x: Math.max(0, Math.min(point.x, bounds.width - playerSize)),
    y: Math.max(0, Math.min(point.y, bounds.height - playerSize))
  };
}
