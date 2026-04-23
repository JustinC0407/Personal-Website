import type { Hotspot, Rect } from "@/lib/content";
import { rectsOverlap } from "@/lib/collisions";

export function getActiveHotspot(player: Rect, hotspots: Hotspot[]) {
  const interactionBounds = {
    id: "interaction",
    x: player.x - 18,
    y: player.y - 18,
    width: player.width + 36,
    height: player.height + 36
  };

  return hotspots.find((hotspot) => rectsOverlap(interactionBounds, hotspot));
}
