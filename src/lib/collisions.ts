import type { CollisionShape, EllipseCollision, Rect } from "@/lib/content";

export type Point = {
  x: number;
  y: number;
};

export function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function isEllipseCollision(collision: CollisionShape): collision is EllipseCollision {
  return (
    collision.shape === "ellipse" &&
    typeof collision.cx === "number" &&
    typeof collision.cy === "number" &&
    typeof collision.rx === "number" &&
    typeof collision.ry === "number"
  );
}

function rectIntersectsEllipse(rect: Rect, ellipse: EllipseCollision) {
  const closestX = Math.max(rect.x, Math.min(ellipse.cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(ellipse.cy, rect.y + rect.height));
  const dx = (closestX - ellipse.cx) / ellipse.rx;
  const dy = (closestY - ellipse.cy) / ellipse.ry;

  return dx * dx + dy * dy <= 1;
}

export function isBlocked(player: Rect, collisions: CollisionShape[]) {
  return collisions.some((collision) => (isEllipseCollision(collision) ? rectIntersectsEllipse(player, collision) : rectsOverlap(player, collision)));
}

export function clampPoint(point: Point, bounds: { width: number; height: number }, player: { width: number; height: number }) {
  return {
    x: Math.max(0, Math.min(point.x, bounds.width - player.width)),
    y: Math.max(0, Math.min(point.y, bounds.height - player.height))
  };
}
