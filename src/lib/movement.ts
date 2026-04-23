import type { Point } from "@/lib/collisions";
import type { Rect } from "@/lib/content";
import { clampPoint, isBlocked } from "@/lib/collisions";

type MoveOptions = {
  current: Point;
  delta: Point;
  bounds: { width: number; height: number };
  playerSize: number;
  collisions: Rect[];
};

export function moveWithCollisions({ current, delta, bounds, playerSize, collisions }: MoveOptions) {
  const nextX = clampPoint({ x: current.x + delta.x, y: current.y }, bounds, playerSize);
  const xRect = { id: "player", x: nextX.x, y: nextX.y, width: playerSize, height: playerSize };
  const afterX = isBlocked(xRect, collisions) ? current : nextX;

  const nextY = clampPoint({ x: afterX.x, y: afterX.y + delta.y }, bounds, playerSize);
  const yRect = { id: "player", x: nextY.x, y: nextY.y, width: playerSize, height: playerSize };

  return isBlocked(yRect, collisions) ? afterX : nextY;
}
