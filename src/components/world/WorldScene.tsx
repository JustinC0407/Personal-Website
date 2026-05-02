"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bug, FolderKanban, Home, Mail, Menu, Minus, Palette, Plus, Save, Trash2, UserRound, X } from "lucide-react";
import type { CollisionShape, Hotspot, PigeonConfig, Rect, WorldData, WorldScene as Scene } from "@/lib/content";
import { getActiveHotspot } from "@/lib/hotspots";
import { clampPoint, isBlocked, isEllipseCollision, isInsideWalkableArea } from "@/lib/collisions";
import { PortfolioModal } from "@/components/PortfolioModal";

const PLAYER_HITBOX_WIDTH = 26;
const PLAYER_HITBOX_HEIGHT = 52;
const PLAYER_SPEED = 200;
const DEFAULT_CAMERA_SCALE = 1.7;
const MIN_CAMERA_SCALE = 1.15;
const MAX_CAMERA_SCALE = 2.35;
const CAMERA_SCALE_STEP = 0.15;
// Temporary design/testing override. Set this to false or delete the toggle prop
// wiring below for production; automatic device detection will still choose controls.
const SHOW_CONTROL_MODE_TOGGLE = true;
const MOBILE_TEST_VIEWPORT = {
  width: 390,
  height: 844
};

type ControlMode = "laptop" | "mobile";

type WorldSceneProps = {
  data: WorldData;
};

type Point = {
  x: number;
  y: number;
};

type MoveDirection = keyof PressedKeys;
type FacingDirection = "front" | "back" | "left" | "right";

type PressedKeys = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

type FallingPetal = {
  id: string;
  src: string;
  left: number;
  size: number;
  fallDuration: number;
  delay: number;
  swayDistance: number;
  swayDuration: number;
  rotate: number;
};

type PigeonAnimationName = "Idle" | "Movement" | "Peck" | "Flight";
type PigeonPhase = "idle" | "peck" | "walk" | "flight" | "land";
type PigeonSpriteFrame = {
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  duration: number;
};
type PigeonSpriteData = {
  frames: Record<string, PigeonSpriteFrame>;
  meta: {
    size: {
      w: number;
      h: number;
    };
  };
};
type PigeonSnapshot = {
  animation: PigeonAnimationName;
  facing: "left" | "right";
  frameIndex: number;
  phase: PigeonPhase;
  x: number;
  y: number;
};

type EditorLayer = "collisions" | "walkableAreas" | "depthZones";
type EditorShape = "rect" | "ellipse";
type ResizeHandle = "nw" | "ne" | "sw" | "se";
type EditorSelection = {
  layer: EditorLayer;
  id: string;
} | null;
type EditorDraft =
  | {
      mode: "draw";
      layer: EditorLayer;
      id: string;
      start: Point;
    }
  | {
      mode: "move";
      layer: EditorLayer;
      id: string;
      start: Point;
      original: EditableShape;
    }
  | {
      mode: "resize";
      layer: EditorLayer;
      id: string;
      handle: ResizeHandle;
      originalBounds: Bounds;
    };
type EditableShape = CollisionShape | Rect;
type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const emptyKeys: PressedKeys = {
  up: false,
  down: false,
  left: false,
  right: false
};

const emptyKeyOrder: Record<MoveDirection, number> = {
  up: 0,
  down: 0,
  left: 0,
  right: 0
};

const PLAYER_SPRITE_WIDTH = 48;
const PLAYER_SPRITE_HEIGHT = 90;
const PLAYER_SHADOW_WIDTH = 30;
const PLAYER_SHADOW_HEIGHT = 15;
const WALK_FRAME_SEQUENCE = ["stand", "2", "stand", "4"] as const;
const WALK_FRAME_DURATION_MS = 140;
const PETAL_COUNT = 16;
const MIN_EDITOR_SHAPE_SIZE = 8;
const WORLD_TRANSITION_FADE_MS = 180;
const WORLD_TRANSITION_HOLD_MS = 120;

const drawerItems = [
  { id: "about", label: "About + Skills", icon: UserRound },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "contact", label: "Contact / Resume", icon: Mail }
] as const;

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildPetalPool(count: number): FallingPetal[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const fallDuration = 7 + seededRandom(seed * 4.11) * 6;

    return {
      id: `petal-${seed}`,
      src: `/art/world_petal_${1 + Math.floor(seededRandom(seed * 2.17) * 3)}.png`,
      left: seededRandom(seed * 8.73) * 108 - 4,
      size: 12 + seededRandom(seed * 5.41) * 8,
      fallDuration,
      delay: -seededRandom(seed * 9.29) * fallDuration,
      swayDistance: 18 + seededRandom(seed * 10.57) * 52,
      swayDuration: 2.4 + seededRandom(seed * 11.83) * 3.2,
      rotate: (seededRandom(seed * 12.97) > 0.5 ? 1 : -1) * (80 + seededRandom(seed * 14.21) * 240)
    };
  });
}

function getPigeonAnimationFrames(spriteData: PigeonSpriteData, animation: PigeonAnimationName) {
  return Object.entries(spriteData.frames)
    .filter(([name]) => name.includes(`(${animation})`))
    .sort(([, first], [, second]) => first.frame.x - second.frame.x)
    .map(([, frame]) => frame);
}

function getLoopedFrameIndex(frames: PigeonSpriteFrame[], elapsed: number) {
  const totalDuration = frames.reduce((total, frame) => total + frame.duration, 0);

  if (totalDuration <= 0) {
    return 0;
  }

  let localTime = elapsed % totalDuration;

  for (let index = 0; index < frames.length; index += 1) {
    localTime -= frames[index].duration;

    if (localTime < 0) {
      return index;
    }
  }

  return 0;
}

function easeInOut(value: number) {
  return value * value * (3 - 2 * value);
}

function lerp(start: number, end: number, value: number) {
  return start + (end - start) * value;
}

function getPigeonWalkTarget(pigeon: PigeonConfig) {
  const seed = pigeon.id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  const angle = seededRandom(seed * 3.41) * Math.PI * 2;
  const distance = pigeon.wanderRadius * (0.58 + seededRandom(seed * 5.17) * 0.34);

  return {
    x: pigeon.x + Math.cos(angle) * distance,
    y: pigeon.y + Math.sin(angle) * distance * 0.42
  };
}

function getPigeonWalkPosition(base: Point, target: Point, progress: number) {
  const outAndBack = progress < 0.5 ? easeInOut(progress * 2) : easeInOut((1 - progress) * 2);

  return {
    x: lerp(base.x, target.x, outAndBack),
    y: lerp(base.y, target.y, outAndBack)
  };
}

function getPigeonSnapshot(pigeon: PigeonConfig, elapsed: number, framesByAnimation: Record<PigeonAnimationName, PigeonSpriteFrame[]>): PigeonSnapshot {
  const { idle, peck, walk, land, offset } = pigeon.timings;
  const homeBase = { x: pigeon.x, y: pigeon.y };
  const awayBase = { x: pigeon.flightPath.end.x, y: pigeon.flightPath.end.y + 32 };
  const flightDistance = Math.hypot(awayBase.x - homeBase.x, awayBase.y - homeBase.y);
  const flight = Math.max(1800, (flightDistance / Math.max(1, pigeon.flightPath.speed)) * 1000);
  const postFlightIdle = Math.max(900, Math.round(idle * 0.55));
  const cycleDuration = idle + peck + walk + flight + land + postFlightIdle;
  const totalTime = elapsed + offset;
  const cycleIndex = Math.floor(totalTime / cycleDuration);
  const localTime = totalTime % cycleDuration;
  const base = cycleIndex % 2 === 0 ? homeBase : awayBase;
  const destination = cycleIndex % 2 === 0 ? awayBase : homeBase;
  const walkTarget = getPigeonWalkTarget(pigeon);
  const localWalkTarget = {
    x: base.x + (walkTarget.x - pigeon.x),
    y: base.y + (walkTarget.y - pigeon.y)
  };

  if (localTime < idle) {
    return {
      animation: "Idle",
      facing: "right",
      frameIndex: getLoopedFrameIndex(framesByAnimation.Idle, localTime * 0.62),
      phase: "idle",
      ...base
    };
  }

  if (localTime < idle + peck) {
    return {
      animation: "Peck",
      facing: "right",
      frameIndex: getLoopedFrameIndex(framesByAnimation.Peck, localTime - idle),
      phase: "peck",
      ...base
    };
  }

  if (localTime < idle + peck + walk) {
    const progress = (localTime - idle - peck) / walk;
    const walkPosition = getPigeonWalkPosition(base, localWalkTarget, progress);

    return {
      animation: "Movement",
      facing: progress < 0.5 ? (localWalkTarget.x < base.x ? "left" : "right") : (base.x < localWalkTarget.x ? "left" : "right"),
      frameIndex: getLoopedFrameIndex(framesByAnimation.Movement, localTime - idle - peck),
      phase: "walk",
      x: walkPosition.x,
      y: walkPosition.y
    };
  }

  if (localTime < idle + peck + walk + flight) {
    const progress = (localTime - idle - peck - walk) / flight;
    const eased = easeInOut(progress);
    const flightBaseY = lerp(base.y, destination.y, eased);

    return {
      animation: "Flight",
      facing: destination.x < base.x ? "left" : "right",
      frameIndex: getLoopedFrameIndex(framesByAnimation.Flight, localTime - idle - peck - walk),
      phase: "flight",
      x: lerp(base.x, destination.x, eased),
      y: flightBaseY - Math.sin(progress * Math.PI) * pigeon.flightPath.arcHeight
    };
  }

  if (localTime < idle + peck + walk + flight + land) {
    const progress = easeInOut((localTime - idle - peck - walk - flight) / land);

    return {
      animation: "Movement",
      facing: destination.x < base.x ? "left" : "right",
      frameIndex: getLoopedFrameIndex(framesByAnimation.Movement, localTime - idle - peck - walk - flight),
      phase: "land",
      x: destination.x,
      y: lerp(destination.y - 32, destination.y, progress)
    };
  }

  return {
    animation: "Idle",
    facing: "right",
    frameIndex: getLoopedFrameIndex(framesByAnimation.Idle, (localTime - idle - peck - walk - flight - land) * 0.62),
    phase: "idle",
    ...destination
  };
}

function keyToDirection(key: string): MoveDirection | null {
  if (key === "w" || key === "arrowup") return "up";
  if (key === "s" || key === "arrowdown") return "down";
  if (key === "a" || key === "arrowleft") return "left";
  if (key === "d" || key === "arrowright") return "right";
  return null;
}

function directionToFacing(direction: MoveDirection): FacingDirection {
  if (direction === "up") return "back";
  if (direction === "down") return "front";
  if (direction === "left") return "left";
  return "right";
}

function getFacingFromKeys(keys: PressedKeys, keyOrder: Record<MoveDirection, number>): FacingDirection | null {
  const activeDirection = (Object.entries(keys) as [MoveDirection, boolean][])
    .filter(([, pressed]) => pressed)
    .sort((first, second) => keyOrder[second[0]] - keyOrder[first[0]])[0]?.[0];

  return activeDirection ? directionToFacing(activeDirection) : null;
}

function getFacingFromVector(vector: Point): FacingDirection | null {
  if (vector.x === 0 && vector.y === 0) {
    return null;
  }

  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x < 0 ? "left" : "right";
  }

  return vector.y < 0 ? "back" : "front";
}

function cloneWorldData(data: WorldData): WorldData {
  const cloned = JSON.parse(JSON.stringify(data)) as WorldData;
  return normalizeWorldData(cloned);
}

function normalizeWorldData(data: WorldData): WorldData {
  return {
    ...data,
    scenes: data.scenes.map((scene) => ({
      ...scene,
      collisions: ensureUniqueShapeIds(scene.collisions),
      walkableAreas: ensureUniqueShapeIds(scene.walkableAreas ?? []),
      depthZones: ensureUniqueShapeIds(scene.depthZones)
    }))
  };
}

function ensureUniqueShapeIds<T extends { id: string }>(shapes: T[]): T[] {
  const used = new Set<string>();

  return shapes.map((shape) => {
    let id = shape.id;
    let suffix = 2;

    while (used.has(id)) {
      id = `${shape.id}-${suffix}`;
      suffix += 1;
    }

    used.add(id);
    return id === shape.id ? shape : { ...shape, id };
  });
}

function roundPoint(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}

function shapeToBounds(shape: EditableShape): Bounds {
  if ("shape" in shape && shape.shape === "ellipse") {
    return {
      x: shape.cx - shape.rx,
      y: shape.cy - shape.ry,
      width: shape.rx * 2,
      height: shape.ry * 2
    };
  }

  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height
  };
}

function boundsToShape(id: string, bounds: Bounds, layer: EditorLayer, shapeKind: EditorShape): EditableShape {
  const normalized = normalizeBounds(bounds);

  if (layer !== "depthZones" && shapeKind === "ellipse") {
    return {
      id,
      shape: "ellipse",
      cx: Math.round(normalized.x + normalized.width / 2),
      cy: Math.round(normalized.y + normalized.height / 2),
      rx: Math.max(MIN_EDITOR_SHAPE_SIZE / 2, Math.round(normalized.width / 2)),
      ry: Math.max(MIN_EDITOR_SHAPE_SIZE / 2, Math.round(normalized.height / 2))
    };
  }

  return {
    id,
    ...(layer !== "depthZones" ? { shape: "rect" as const } : {}),
    x: Math.round(normalized.x),
    y: Math.round(normalized.y),
    width: Math.max(MIN_EDITOR_SHAPE_SIZE, Math.round(normalized.width)),
    height: Math.max(MIN_EDITOR_SHAPE_SIZE, Math.round(normalized.height))
  };
}

function normalizeBounds(bounds: Bounds): Bounds {
  const x = bounds.width < 0 ? bounds.x + bounds.width : bounds.x;
  const y = bounds.height < 0 ? bounds.y + bounds.height : bounds.y;

  return {
    x,
    y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height)
  };
}

function moveShape(shape: EditableShape, delta: Point): EditableShape {
  if ("shape" in shape && shape.shape === "ellipse") {
    return {
      ...shape,
      cx: Math.round(shape.cx + delta.x),
      cy: Math.round(shape.cy + delta.y)
    };
  }

  return {
    ...shape,
    x: Math.round(shape.x + delta.x),
    y: Math.round(shape.y + delta.y)
  };
}

function resizeBounds(bounds: Bounds, handle: ResizeHandle, point: Point): Bounds {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  if (handle === "nw") {
    return { x: point.x, y: point.y, width: right - point.x, height: bottom - point.y };
  }

  if (handle === "ne") {
    return { x: bounds.x, y: point.y, width: point.x - bounds.x, height: bottom - point.y };
  }

  if (handle === "sw") {
    return { x: point.x, y: bounds.y, width: right - point.x, height: point.y - bounds.y };
  }

  return { x: bounds.x, y: bounds.y, width: point.x - bounds.x, height: point.y - bounds.y };
}

function getResizeHandles(bounds: Bounds) {
  const size = 14;
  const half = size / 2;

  return [
    { id: "nw" as const, x: bounds.x - half, y: bounds.y - half, cursor: "nwse-resize" },
    { id: "ne" as const, x: bounds.x + bounds.width - half, y: bounds.y - half, cursor: "nesw-resize" },
    { id: "sw" as const, x: bounds.x - half, y: bounds.y + bounds.height - half, cursor: "nesw-resize" },
    { id: "se" as const, x: bounds.x + bounds.width - half, y: bounds.y + bounds.height - half, cursor: "nwse-resize" }
  ];
}

function pointInBounds(point: Point, bounds: Bounds) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function pointInShape(point: Point, shape: EditableShape) {
  if ("shape" in shape && shape.shape === "ellipse") {
    const dx = (point.x - shape.cx) / shape.rx;
    const dy = (point.y - shape.cy) / shape.ry;
    return dx * dx + dy * dy <= 1;
  }

  return pointInBounds(point, shapeToBounds(shape));
}

function getSceneShapes(scene: Scene, layer: EditorLayer): EditableShape[] {
  if (layer === "collisions") {
    return scene.collisions;
  }

  if (layer === "walkableAreas") {
    return scene.walkableAreas ?? [];
  }

  return scene.depthZones;
}

function replaceSceneShape(scene: Scene, layer: EditorLayer, id: string, nextShape: EditableShape): Scene {
  if (layer === "collisions") {
    return {
      ...scene,
      collisions: scene.collisions.map((shape) => (shape.id === id ? (nextShape as CollisionShape) : shape))
    };
  }

  if (layer === "walkableAreas") {
    return {
      ...scene,
      walkableAreas: (scene.walkableAreas ?? []).map((shape) => (shape.id === id ? (nextShape as CollisionShape) : shape))
    };
  }

  return {
    ...scene,
    depthZones: scene.depthZones.map((shape) => (shape.id === id ? (nextShape as Rect) : shape))
  };
}

function removeSceneShape(scene: Scene, layer: EditorLayer, id: string): Scene {
  if (layer === "collisions") {
    return {
      ...scene,
      collisions: scene.collisions.filter((shape) => shape.id !== id)
    };
  }

  if (layer === "walkableAreas") {
    return {
      ...scene,
      walkableAreas: (scene.walkableAreas ?? []).filter((shape) => shape.id !== id)
    };
  }

  return {
    ...scene,
    depthZones: scene.depthZones.filter((shape) => shape.id !== id)
  };
}

function addSceneShape(scene: Scene, layer: EditorLayer, shape: EditableShape): Scene {
  if (layer === "collisions") {
    return {
      ...scene,
      collisions: [...scene.collisions, shape as CollisionShape]
    };
  }

  if (layer === "walkableAreas") {
    return {
      ...scene,
      walkableAreas: [...(scene.walkableAreas ?? []), shape as CollisionShape]
    };
  }

  return {
    ...scene,
    depthZones: [...scene.depthZones, shape as Rect]
  };
}

function buildShapeId(layer: EditorLayer, existingIds: Set<string>) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const prefix = layer === "collisions" ? "collision" : layer === "walkableAreas" ? "walkable-area" : "depth-zone";
  let id = `${prefix}-${stamp}`;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${prefix}-${stamp}-${suffix}`;
    suffix += 1;
  }

  return id;
}

export function WorldScene({ data }: WorldSceneProps) {
  const [worldData, setWorldData] = useState<WorldData>(() => cloneWorldData(data));
  const [sceneId, setSceneId] = useState(data.scenes[0]?.id ?? "outside");
  const scene = useMemo(() => worldData.scenes.find((item) => item.id === sceneId) ?? worldData.scenes[0], [worldData.scenes, sceneId]);
  const [position, setPosition] = useState<Point>(scene.spawn);
  const positionRef = useRef<Point>(scene.spawn);
  const keysRef = useRef<PressedKeys>(emptyKeys);
  const keyOrderRef = useRef<Record<MoveDirection, number>>(emptyKeyOrder);
  const keyOrderCounterRef = useRef(0);
  const dragRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const animationElapsedRef = useRef(0);
  const transitionTimeoutsRef = useRef<number[]>([]);
  const transitionActiveRef = useRef(true);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [debug, setDebug] = useState(false);
  const [editorLayer, setEditorLayer] = useState<EditorLayer>("collisions");
  const [editorShape, setEditorShape] = useState<EditorShape>("rect");
  const [editorSelection, setEditorSelection] = useState<EditorSelection>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<Hotspot["contentType"] | null>(null);
  const [cameraScale, setCameraScale] = useState(DEFAULT_CAMERA_SCALE);
  const [facing, setFacing] = useState<FacingDirection>("front");
  const facingRef = useRef<FacingDirection>("front");
  const [isMoving, setIsMoving] = useState(false);
  const isMovingRef = useRef(false);
  const [walkFrameIndex, setWalkFrameIndex] = useState(0);
  const walkFrameIndexRef = useRef(0);
  const [detectedControlMode, setDetectedControlMode] = useState<ControlMode>("laptop");
  const [controlModeOverride, setControlModeOverride] = useState<ControlMode | null>(null);
  const [transitionActive, setTransitionActive] = useState(true);
  const [transitionCovered, setTransitionCovered] = useState(true);
  const controlMode = controlModeOverride ?? detectedControlMode;
  const isMobileTestView = SHOW_CONTROL_MODE_TOGGLE && controlModeOverride === "mobile";
  const effectiveViewport = isMobileTestView
    ? {
        width: Math.min(MOBILE_TEST_VIEWPORT.width, viewport.width - 32),
        height: Math.min(MOBILE_TEST_VIEWPORT.height, viewport.height - 32)
      }
    : viewport;
  const playerBounds = useMemo(() => ({ width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT }), []);
  const petalPool = useMemo(() => buildPetalPool(PETAL_COUNT), []);

  useEffect(() => {
    setWorldData((current) => normalizeWorldData(current));
  }, []);

  const playerRect = useMemo(
    () => ({ id: "player", x: position.x, y: position.y, width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT }),
    [position]
  );
  const nearbyHotspot = useMemo(() => getActiveHotspot(playerRect, scene.hotspots), [playerRect, scene.hotspots]);
  const playerInDepthZone = useMemo(() => scene.depthZones.some((zone) => playerRect.x < zone.x + zone.width && playerRect.x + playerRect.width > zone.x && playerRect.y < zone.y + zone.height && playerRect.y + playerRect.height > zone.y), [playerRect, scene.depthZones]);

  const camera = useMemo(() => {
    const viewWidth = effectiveViewport.width / cameraScale;
    const viewHeight = effectiveViewport.height / cameraScale;
    const targetX = position.x + PLAYER_HITBOX_WIDTH / 2 - viewWidth / 2;
    const targetY = position.y + PLAYER_HITBOX_HEIGHT / 2 - viewHeight / 2;

    return {
      x: Math.max(0, Math.min(targetX, worldData.sceneSize.width - viewWidth)),
      y: Math.max(0, Math.min(targetY, worldData.sceneSize.height - viewHeight))
    };
  }, [cameraScale, effectiveViewport.height, effectiveViewport.width, position.x, position.y, worldData.sceneSize.height, worldData.sceneSize.width]);

  const playerSpriteSrc = useMemo(() => {
    const pose = isMoving ? WALK_FRAME_SEQUENCE[walkFrameIndex] : "stand";
    return `/art/character_${facing}_${pose}.png`;
  }, [facing, isMoving, walkFrameIndex]);

  const setFacingState = useCallback((nextFacing: FacingDirection) => {
    if (facingRef.current === nextFacing) {
      return;
    }

    facingRef.current = nextFacing;
    setFacing(nextFacing);
  }, []);

  const setMovingState = useCallback((nextMoving: boolean) => {
    if (isMovingRef.current === nextMoving) {
      return;
    }

    isMovingRef.current = nextMoving;
    setIsMoving(nextMoving);
  }, []);

  const resetWalkAnimation = useCallback(() => {
    animationElapsedRef.current = 0;

    if (walkFrameIndexRef.current !== 0) {
      walkFrameIndexRef.current = 0;
      setWalkFrameIndex(0);
    }
  }, []);

  const clearTransitionTimeouts = useCallback(() => {
    transitionTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    transitionTimeoutsRef.current = [];
  }, []);

  const setTransitionActiveState = useCallback((nextActive: boolean) => {
    transitionActiveRef.current = nextActive;
    setTransitionActive(nextActive);
  }, []);

  const setScene = useCallback(
    (nextSceneId: string, targetSpawn?: Point) => {
      const nextScene = worldData.scenes.find((item) => item.id === nextSceneId);
      if (!nextScene) {
        return;
      }

      const nextPosition = targetSpawn ?? nextScene.spawn;

      clearTransitionTimeouts();
      keysRef.current = emptyKeys;
      keyOrderRef.current = emptyKeyOrder;
      keyOrderCounterRef.current = 0;
      dragRef.current = null;
      dragOriginRef.current = null;
      setMovingState(false);
      resetWalkAnimation();

      setTransitionActiveState(true);
      setTransitionCovered(true);

      const swapTimeout = window.setTimeout(() => {
        positionRef.current = nextPosition;
        setPosition(nextPosition);
        setSceneId(nextScene.id);
        setActiveModal(null);

        const revealTimeout = window.setTimeout(() => {
          setTransitionCovered(false);

          const doneTimeout = window.setTimeout(() => {
            setTransitionActiveState(false);
          }, WORLD_TRANSITION_FADE_MS);

          transitionTimeoutsRef.current.push(doneTimeout);
        }, WORLD_TRANSITION_HOLD_MS);

        transitionTimeoutsRef.current.push(revealTimeout);
      }, WORLD_TRANSITION_FADE_MS);

      transitionTimeoutsRef.current.push(swapTimeout);
    },
    [clearTransitionTimeouts, resetWalkAnimation, setMovingState, setTransitionActiveState, worldData.scenes]
  );

  const tryMove = useCallback(
    (current: Point, delta: Point) => {
      const nextX = clampPoint({ x: current.x + delta.x, y: current.y }, worldData.sceneSize, playerBounds);
      const xRect = { id: "player", x: nextX.x, y: nextX.y, width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT };
      const afterX = isBlocked(xRect, scene.collisions) || !isInsideWalkableArea(xRect, scene.walkableAreas) ? current : nextX;

      const nextY = clampPoint({ x: afterX.x, y: afterX.y + delta.y }, worldData.sceneSize, playerBounds);
      const yRect = { id: "player", x: nextY.x, y: nextY.y, width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT };

      return isBlocked(yRect, scene.collisions) || !isInsideWalkableArea(yRect, scene.walkableAreas) ? afterX : nextY;
    },
    [playerBounds, scene.collisions, scene.walkableAreas, worldData.sceneSize]
  );

  const activateHotspot = useCallback(
    (hotspot: Hotspot) => {
      if (hotspot.targetScene) {
        setScene(hotspot.targetScene, hotspot.targetSpawn);
        return;
      }

      if (hotspot.contentType) {
        setActiveModal(hotspot.contentType);
      }
    },
    [setScene]
  );

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const revealTimeout = window.setTimeout(() => {
      setTransitionCovered(false);

      const doneTimeout = window.setTimeout(() => {
        setTransitionActiveState(false);
      }, WORLD_TRANSITION_FADE_MS);

      transitionTimeoutsRef.current.push(doneTimeout);
    }, WORLD_TRANSITION_HOLD_MS);

    transitionTimeoutsRef.current.push(revealTimeout);

    return clearTransitionTimeouts;
  }, [clearTransitionTimeouts, setTransitionActiveState]);

  useEffect(() => {
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const hoverNone = window.matchMedia("(hover: none)");

    function syncControlMode() {
      setDetectedControlMode(coarsePointer.matches || hoverNone.matches ? "mobile" : "laptop");
    }

    syncControlMode();
    coarsePointer.addEventListener("change", syncControlMode);
    hoverNone.addEventListener("change", syncControlMode);

    return () => {
      coarsePointer.removeEventListener("change", syncControlMode);
      hoverNone.removeEventListener("change", syncControlMode);
    };
  }, []);

  useEffect(() => {
    function updateKey(event: KeyboardEvent, pressed: boolean) {
      const key = event.key.toLowerCase();
      const direction = keyToDirection(key);

      if (pressed && debug && editorSelection && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        setWorldData((current) => ({
          ...current,
          scenes: current.scenes.map((item) => (item.id === scene.id ? removeSceneShape(item, editorSelection.layer, editorSelection.id) : item))
        }));
        setEditorSelection(null);
        setSaveState("idle");
        setSaveMessage("Unsaved changes");
        return;
      }

      if (direction && controlMode === "laptop" && !debug && !transitionActive) {
        const next = { ...keysRef.current, [direction]: pressed };
        event.preventDefault();

        if (pressed && !keysRef.current[direction]) {
          keyOrderCounterRef.current += 1;
          keyOrderRef.current = { ...keyOrderRef.current, [direction]: keyOrderCounterRef.current };
        }

        keysRef.current = next;
      }

      if (pressed && !debug && !transitionActive && (key === "e" || key === "enter") && nearbyHotspot) {
        event.preventDefault();
        activateHotspot(nearbyHotspot);
      }

      if (pressed && key === "escape") {
        setActiveModal(null);
        setDrawerOpen(false);
      }
    }

    const down = (event: KeyboardEvent) => updateKey(event, true);
    const up = (event: KeyboardEvent) => updateKey(event, false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [activateHotspot, controlMode, debug, editorSelection, nearbyHotspot, scene.id, transitionActive]);

  useEffect(() => {
    keysRef.current = emptyKeys;
    keyOrderRef.current = emptyKeyOrder;
    keyOrderCounterRef.current = 0;
    dragRef.current = null;
    dragOriginRef.current = null;
    setMovingState(false);
    resetWalkAnimation();
  }, [controlMode, resetWalkAnimation, setMovingState]);

  useEffect(() => {
    let frame = 0;

    function tick(time: number) {
      const last = lastFrameRef.current ?? time;
      const deltaSeconds = Math.min((time - last) / 1000, 0.05);
      lastFrameRef.current = time;

      if (!activeModal && !drawerOpen && !debug && !transitionActiveRef.current) {
        const keys = controlMode === "laptop" ? keysRef.current : emptyKeys;
        let dx = Number(keys.right) - Number(keys.left);
        let dy = Number(keys.down) - Number(keys.up);
        const inputFacing = controlMode === "laptop" ? getFacingFromKeys(keysRef.current, keyOrderRef.current) : null;

        if (controlMode === "mobile" && dragRef.current) {
          dx += dragRef.current.x;
          dy += dragRef.current.y;
        }

        const magnitude = Math.hypot(dx, dy);
        const dragFacing = controlMode === "mobile" && dragRef.current ? getFacingFromVector(dragRef.current) : null;
        const nextFacing = inputFacing ?? dragFacing;

        if (nextFacing) {
          setFacingState(nextFacing);
        }

        if (magnitude > 0) {
          const normalized = { x: dx / magnitude, y: dy / magnitude };
          const next = tryMove(positionRef.current, {
            x: normalized.x * PLAYER_SPEED * deltaSeconds,
            y: normalized.y * PLAYER_SPEED * deltaSeconds
          });
          const moved = next.x !== positionRef.current.x || next.y !== positionRef.current.y;

          positionRef.current = next;
          setPosition(next);

          if (moved) {
            setMovingState(true);
            animationElapsedRef.current += deltaSeconds * 1000;

            if (animationElapsedRef.current >= WALK_FRAME_DURATION_MS) {
              const frameSteps = Math.floor(animationElapsedRef.current / WALK_FRAME_DURATION_MS);
              animationElapsedRef.current -= frameSteps * WALK_FRAME_DURATION_MS;
              const nextFrameIndex = (walkFrameIndexRef.current + frameSteps) % WALK_FRAME_SEQUENCE.length;

              if (walkFrameIndexRef.current !== nextFrameIndex) {
                walkFrameIndexRef.current = nextFrameIndex;
                setWalkFrameIndex(nextFrameIndex);
              }
            }
          } else {
            setMovingState(false);
            resetWalkAnimation();
          }
        } else {
          setMovingState(false);
          resetWalkAnimation();
        }
      } else {
        setMovingState(false);
        resetWalkAnimation();
      }

      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activeModal, controlMode, debug, drawerOpen, resetWalkAnimation, setFacingState, setMovingState, tryMove]);

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (debug || transitionActive || controlMode !== "mobile" || event.pointerType === "mouse") {
      return;
    }

    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    dragRef.current = null;
  }

  function updateDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (debug || transitionActive || controlMode !== "mobile" || event.pointerType === "mouse" || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const origin = dragOriginRef.current;

    if (!origin) {
      return;
    }

    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);

    dragRef.current = distance > 8 ? { x: dx / distance, y: dy / distance } : null;
  }

  function endDrag() {
    dragRef.current = null;
    dragOriginRef.current = null;
  }

  const updateCurrentScene = useCallback((updater: (currentScene: Scene) => Scene) => {
    setWorldData((current) => ({
      ...current,
      scenes: current.scenes.map((item) => (item.id === sceneId ? updater(item) : item))
    }));
    setSaveState("idle");
    setSaveMessage("Unsaved changes");
  }, [sceneId]);

  const deleteSelectedShape = useCallback(() => {
    if (!editorSelection) {
      return;
    }

    updateCurrentScene((currentScene) => removeSceneShape(currentScene, editorSelection.layer, editorSelection.id));
    setEditorSelection(null);
  }, [editorSelection, updateCurrentScene]);

  const saveWorldData = useCallback(async () => {
    setSaveState("saving");
    setSaveMessage("Saving...");

    try {
      const response = await fetch("/api/world-editor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(worldData)
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(error?.error ?? "Unable to save world.json");
      }

      setSaveState("saved");
      setSaveMessage("Saved to world.json");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Unable to save world.json");
    }
  }, [worldData]);

  return (
    <section className="fixed inset-0 bg-[#1d5f48] text-ink">
      <div
        className={
          isMobileTestView
            ? "absolute left-1/2 top-1/2 overflow-hidden border-[6px] border-[#5f2f20] bg-[#1d5f48] shadow-[0_10px_0_rgba(47,37,48,0.35)]"
            : "absolute inset-0 overflow-hidden bg-[#1d5f48]"
        }
        onPointerCancel={endDrag}
        onPointerDown={beginDrag}
        onPointerMove={updateDrag}
        onPointerUp={endDrag}
        style={
          isMobileTestView
            ? {
                width: effectiveViewport.width,
                height: effectiveViewport.height,
                transform: "translate3d(-50%, -50%, 0)"
              }
            : undefined
        }
      >
        <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: worldData.sceneSize.width,
          height: worldData.sceneSize.height,
          transform: `translate3d(${-camera.x * cameraScale}px, ${-camera.y * cameraScale}px, 0) scale(${cameraScale})`
        }}
      >
        <SceneBackdrop scene={scene} />
        {scene.id === "outside" ? <FallingPetals petals={petalPool} sceneSize={worldData.sceneSize} /> : null}
        {playerInDepthZone ? <SceneForegroundOverlay scene={scene} behindPlayer /> : null}
        {debug ? (
          <DebugEditorOverlay
            activeLayer={editorLayer}
            cameraScale={cameraScale}
            scene={scene}
            sceneSize={worldData.sceneSize}
            selected={editorSelection}
            shapeKind={editorShape}
            onSelect={setEditorSelection}
            onUpdateScene={updateCurrentScene}
          />
        ) : null}
        {scene.hotspots.map((hotspot) => (
          <button
            aria-label={hotspot.label}
            className="absolute z-20 border-4 border-transparent bg-transparent transition focus-visible:border-wheat disabled:pointer-events-none"
            disabled={debug || transitionActive}
            key={hotspot.id}
            onClick={(event) => {
              event.stopPropagation();
              activateHotspot(hotspot);
            }}
            style={{ transform: `translate3d(${hotspot.x}px, ${hotspot.y}px, 0)`, width: hotspot.width, height: hotspot.height }}
            type="button"
          />
        ))}
        {scene.id === "outside" && scene.pigeons?.length ? <PigeonLayer pigeons={scene.pigeons} /> : null}
        <div
          aria-label="Player"
          className="pointer-events-none absolute z-30 select-none"
          style={{
            width: PLAYER_SPRITE_WIDTH,
            height: PLAYER_SPRITE_HEIGHT,
            transform: `translate3d(${position.x - (PLAYER_SPRITE_WIDTH - PLAYER_HITBOX_WIDTH) / 2}px, ${position.y + PLAYER_HITBOX_HEIGHT - PLAYER_SPRITE_HEIGHT}px, 0)`
          }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 rounded-full bg-black/35 blur-[1px]"
            style={{
              width: PLAYER_SHADOW_WIDTH,
              height: PLAYER_SHADOW_HEIGHT,
              bottom:-2,
              transform: "translateX(-50%)"
            }}
          />
          <Image
            alt=""
            className="relative h-full w-full"
            draggable={false}
            height={PLAYER_SPRITE_HEIGHT}
            priority
            src={playerSpriteSrc}
            style={{ imageRendering: "pixelated" }}
            unoptimized
            width={PLAYER_SPRITE_WIDTH}
          />
        </div>
        {!playerInDepthZone ? <SceneForegroundOverlay scene={scene} /> : null}
      </div>
        {transitionActive ? (
          <div aria-hidden className={`world-transition-overlay ${transitionCovered ? "world-transition-overlay-covered" : ""}`} />
        ) : null}
      </div>

      <GameHud
        debug={debug}
        drawerOpen={drawerOpen}
        nearbyHotspot={nearbyHotspot}
        onActivateHotspot={() => nearbyHotspot && !transitionActive && activateHotspot(nearbyHotspot)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenModal={(type) => {
          setDrawerOpen(false);
          setActiveModal(type);
        }}
        onToggleDebug={() => setDebug((value) => !value)}
        editorLayer={editorLayer}
        editorShape={editorShape}
        saveMessage={saveMessage}
        saveState={saveState}
        selectedShapeId={editorSelection?.id ?? null}
        onDeleteSelected={deleteSelectedShape}
        onSaveWorldData={saveWorldData}
        onSetEditorLayer={(layer) => {
          setEditorLayer(layer);
          setEditorSelection(null);
        }}
        onSetEditorShape={setEditorShape}
        onToggleControlMode={
          SHOW_CONTROL_MODE_TOGGLE
            ? () => setControlModeOverride((mode) => ((mode ?? detectedControlMode) === "laptop" ? "mobile" : "laptop"))
            : undefined
        }
        onZoomIn={() => setCameraScale((value) => Math.min(MAX_CAMERA_SCALE, Number((value + CAMERA_SCALE_STEP).toFixed(2))))}
        onZoomOut={() => setCameraScale((value) => Math.max(MIN_CAMERA_SCALE, Number((value - CAMERA_SCALE_STEP).toFixed(2))))}
        controlMode={controlMode}
        controlModeIsOverridden={controlModeOverride !== null}
        sceneName={scene.name}
        zoomInDisabled={cameraScale >= MAX_CAMERA_SCALE}
        zoomOutDisabled={cameraScale <= MIN_CAMERA_SCALE}
      />

      {activeModal ? <PortfolioModal type={activeModal} onClose={() => setActiveModal(null)} /> : null}
    </section>
  );
}

function FallingPetals({ petals, sceneSize }: { petals: FallingPetal[]; sceneSize: { width: number; height: number } }) {
  return (
    <div aria-hidden className="world-petals-layer absolute inset-0 z-[27] overflow-hidden">
      {petals.map((petal) => {
        const style = {
          left: `${petal.left.toFixed(4)}%`,
          width: `${petal.size.toFixed(4)}px`,
          height: `${petal.size.toFixed(4)}px`,
          "--petal-start-y": `${-Math.round(80 + petal.size)}px`,
          "--petal-fall-distance": `${sceneSize.height + 180}px`,
          "--petal-fall-duration": `${petal.fallDuration.toFixed(2)}s`,
          "--petal-delay": `${petal.delay.toFixed(2)}s`,
          "--petal-sway-duration": `${petal.swayDuration.toFixed(2)}s`,
          "--petal-sway-distance": `${petal.swayDistance.toFixed(2)}px`,
          "--petal-rotate": `${petal.rotate.toFixed(2)}deg`
        } as CSSProperties;

        return (
          <div className="world-petal" key={petal.id} style={style}>
            <Image
              alt=""
              className="world-petal-image h-full w-full"
              draggable={false}
              height={Math.round(petal.size)}
              src={petal.src}
              unoptimized
              width={Math.round(petal.size)}
            />
          </div>
        );
      })}
    </div>
  );
}

function PigeonLayer({ pigeons }: { pigeons: PigeonConfig[] }) {
  const [spriteData, setSpriteData] = useState<PigeonSpriteData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/art/Pidgeon Sprite Sheet (1).json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PigeonSpriteData | null) => {
        if (active && data) {
          setSpriteData(data);
        }
      })
      .catch(() => {
        if (active) {
          setSpriteData(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncReducedMotion() {
      setReducedMotion(media.matches);
    }

    syncReducedMotion();
    media.addEventListener("change", syncReducedMotion);

    return () => media.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    if (!spriteData || reducedMotion) {
      return;
    }

    let frame = 0;

    function tick(time: number) {
      startedAtRef.current ??= time;
      setElapsed(time - startedAtRef.current);
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, spriteData]);

  const framesByAnimation = useMemo(() => {
    if (!spriteData) {
      return null;
    }

    return {
      Idle: getPigeonAnimationFrames(spriteData, "Idle"),
      Movement: getPigeonAnimationFrames(spriteData, "Movement"),
      Peck: getPigeonAnimationFrames(spriteData, "Peck"),
      Flight: getPigeonAnimationFrames(spriteData, "Flight")
    };
  }, [spriteData]);

  if (!spriteData || !framesByAnimation) {
    return null;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pigeons.map((pigeon) => {
        const snapshot = reducedMotion
          ? {
              animation: "Idle" as const,
              facing: "right" as const,
              frameIndex: 0,
              phase: "idle" as const,
              x: pigeon.x,
              y: pigeon.y
            }
          : getPigeonSnapshot(pigeon, elapsed, framesByAnimation);
        const frames = framesByAnimation[snapshot.animation];
        const frame = frames[snapshot.frameIndex] ?? frames[0];
        const width = frame.frame.w * pigeon.scale;
        const height = frame.frame.h * pigeon.scale;
        const sheetWidth = spriteData.meta.size.w * pigeon.scale;
        const sheetHeight = spriteData.meta.size.h * pigeon.scale;
        const isFlying = snapshot.phase === "flight";

        return (
          <div
            className="absolute select-none"
            key={pigeon.id}
            style={{
              left: snapshot.x - width / 2,
              top: snapshot.y - height,
              width,
              height,
              zIndex: isFlying ? 29 : 28
            }}
          >
            {!isFlying ? (
              <div
                className="absolute left-1/2 rounded-full bg-black/25 blur-[1px]"
                style={{
                  bottom: 8 * pigeon.scale,
                  height: Math.max(4, 5 * pigeon.scale),
                  transform: "translateX(-50%)",
                  width: Math.max(14, 18 * pigeon.scale)
                }}
              />
            ) : null}
            <div
              className="relative h-full w-full"
              style={{
                backgroundImage: 'url("/art/Pidgeon Sprite Sheet.png")',
                backgroundPosition: `${-frame.frame.x * pigeon.scale}px ${-frame.frame.y * pigeon.scale}px`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
                imageRendering: "pixelated",
                transform: snapshot.facing === "left" ? "scaleX(-1)" : undefined,
                transformOrigin: "center bottom"
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function GameHud({
  debug,
  drawerOpen,
  editorLayer,
  editorShape,
  nearbyHotspot,
  onActivateHotspot,
  onCloseDrawer,
  onDeleteSelected,
  onOpenDrawer,
  onOpenModal,
  onSaveWorldData,
  onSetEditorLayer,
  onSetEditorShape,
  onToggleControlMode,
  onToggleDebug,
  onZoomIn,
  onZoomOut,
  controlMode,
  controlModeIsOverridden,
  saveMessage,
  saveState,
  sceneName,
  selectedShapeId,
  zoomInDisabled,
  zoomOutDisabled
}: {
  debug: boolean;
  drawerOpen: boolean;
  editorLayer: EditorLayer;
  editorShape: EditorShape;
  nearbyHotspot?: Hotspot;
  onActivateHotspot: () => void;
  onCloseDrawer: () => void;
  onDeleteSelected: () => void;
  onOpenDrawer: () => void;
  onOpenModal: (type: NonNullable<Hotspot["contentType"]>) => void;
  onSaveWorldData: () => void;
  onSetEditorLayer: (layer: EditorLayer) => void;
  onSetEditorShape: (shape: EditorShape) => void;
  onToggleControlMode?: () => void;
  onToggleDebug: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  controlMode: ControlMode;
  controlModeIsOverridden: boolean;
  saveMessage: string;
  saveState: "idle" | "saving" | "saved" | "error";
  sceneName: string;
  selectedShapeId: string | null;
  zoomInDisabled: boolean;
  zoomOutDisabled: boolean;
}) {
  return (
    <>
      <div className="pointer-events-none fixed left-4 top-4 z-40 flex items-center gap-3">
        <button
          aria-label="Open menu"
          className="pointer-events-auto grid h-14 w-14 place-items-center border-[4px] border-[#5f2f20] bg-[#f6c879] shadow-[0_5px_0_#9a4f2f]"
          onClick={onOpenDrawer}
          type="button"
        >
          <Menu aria-hidden size={28} strokeWidth={3} />
        </button>
        <Link
          className="pointer-events-auto grid h-14 w-14 place-items-center border-[4px] border-[#5f2f20] bg-[#f6c879] shadow-[0_5px_0_#9a4f2f]"
          href="/"
          aria-label="Back to start screen"
        >
          <ArrowLeft aria-hidden size={26} strokeWidth={3} />
        </Link>
        <button
          aria-label="Toggle debug"
          aria-pressed={debug}
          className={`pointer-events-auto hidden h-14 w-14 place-items-center border-[4px] border-[#5f2f20] shadow-[0_5px_0_#9a4f2f] sm:grid ${debug ? "bg-[#ffdf5a]" : "bg-[#f6c879]"}`}
          onClick={onToggleDebug}
          type="button"
        >
          <Bug aria-hidden size={24} strokeWidth={3} />
        </button>
      </div>

      <div className="fixed right-4 top-4 z-40 grid gap-2">
        <div className="pointer-events-none border-[4px] border-[#5f2f20] bg-[#f7d891] px-4 py-3 text-center font-body text-xl font-black text-[#8f3f3a] shadow-[0_5px_0_#9a4f2f]">
          {sceneName}
        </div>
        {onToggleControlMode ? (
          <button
            aria-label="Toggle laptop or mobile controls"
            className="border-[4px] border-[#5f2f20] bg-[#fff0b9] px-3 py-2 text-center font-body text-lg font-black text-[#8f3f3a] shadow-[0_4px_0_#9a4f2f] transition hover:-translate-y-0.5"
            onClick={onToggleControlMode}
            type="button"
          >
            {controlMode === "laptop" ? "Laptop" : "Mobile"}
            {controlModeIsOverridden ? <span className="block text-sm text-[#5f2f20]">test mode</span> : null}
          </button>
        ) : null}
        <div className="ml-auto flex gap-2">
          <button
            aria-label="Zoom out"
            className="grid h-11 w-11 place-items-center border-[4px] border-[#5f2f20] bg-[#f6c879] shadow-[0_4px_0_#9a4f2f] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={zoomOutDisabled}
            onClick={onZoomOut}
            type="button"
          >
            <Minus aria-hidden size={22} strokeWidth={3} />
          </button>
          <button
            aria-label="Zoom in"
            className="grid h-11 w-11 place-items-center border-[4px] border-[#5f2f20] bg-[#f6c879] shadow-[0_4px_0_#9a4f2f] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={zoomInDisabled}
            onClick={onZoomIn}
            type="button"
          >
            <Plus aria-hidden size={22} strokeWidth={3} />
          </button>
        </div>
      </div>

      {debug ? (
        <div className="fixed bottom-4 left-4 z-50 w-[min(360px,calc(100vw-32px))] border-[4px] border-[#5f2f20] bg-[#fff0b9] p-3 font-body text-[#5f2f20] shadow-[0_6px_0_#9a4f2f]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black leading-none text-[#8f3f3a]">Debug editor</div>
              <div className="mt-1 text-sm font-black">{selectedShapeId ? selectedShapeId : "Drag on map to draw"}</div>
            </div>
            <button
              aria-label="Save world data"
              className="grid h-10 w-10 place-items-center border-[3px] border-[#5f2f20] bg-[#f6c879] disabled:opacity-55"
              disabled={saveState === "saving"}
              onClick={onSaveWorldData}
              type="button"
            >
              <Save aria-hidden size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              className={`border-[3px] border-[#5f2f20] px-2 py-2 text-sm font-black ${editorLayer === "collisions" ? "bg-red-300" : "bg-[#f7d891]"}`}
              onClick={() => onSetEditorLayer("collisions")}
              type="button"
            >
              Red collisions
            </button>
            <button
              className={`border-[3px] border-[#5f2f20] px-2 py-2 text-sm font-black ${editorLayer === "walkableAreas" ? "bg-green-300" : "bg-[#f7d891]"}`}
              onClick={() => onSetEditorLayer("walkableAreas")}
              type="button"
            >
              Walkable
            </button>
            <button
              className={`border-[3px] border-[#5f2f20] px-2 py-2 text-sm font-black ${editorLayer === "depthZones" ? "bg-yellow-300" : "bg-[#f7d891]"}`}
              onClick={() => onSetEditorLayer("depthZones")}
              type="button"
            >
              Yellow zones
            </button>
          </div>

          {editorLayer !== "depthZones" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                className={`border-[3px] border-[#5f2f20] px-2 py-2 text-sm font-black ${editorShape === "rect" ? (editorLayer === "walkableAreas" ? "bg-green-300" : "bg-red-300") : "bg-[#f7d891]"}`}
                onClick={() => onSetEditorShape("rect")}
                type="button"
              >
                Rectangle
              </button>
              <button
                className={`border-[3px] border-[#5f2f20] px-2 py-2 text-sm font-black ${editorShape === "ellipse" ? (editorLayer === "walkableAreas" ? "bg-green-300" : "bg-red-300") : "bg-[#f7d891]"}`}
                onClick={() => onSetEditorShape("ellipse")}
                type="button"
              >
                Ellipse
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              className="flex h-10 items-center gap-2 border-[3px] border-[#5f2f20] bg-[#f7d891] px-3 text-sm font-black disabled:opacity-55"
              disabled={!selectedShapeId}
              onClick={onDeleteSelected}
              type="button"
            >
              <Trash2 aria-hidden size={18} strokeWidth={3} />
              Delete
            </button>
            {saveMessage ? (
              <span className={`text-sm font-black ${saveState === "error" ? "text-red-700" : "text-[#5f2f20]"}`}>{saveMessage}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!debug && nearbyHotspot ? (
        <button
          className="fixed bottom-8 left-1/2 z-40 min-w-[260px] -translate-x-1/2 border-[5px] border-[#5f2f20] bg-[#fff0b9] px-6 py-4 font-body text-2xl font-black text-[#8f3f3a] shadow-[0_7px_0_#9a4f2f] transition hover:-translate-y-1"
          onClick={onActivateHotspot}
          type="button"
        >
          {nearbyHotspot.actionLabel}
          <span className="mt-1 block text-base text-[#5f2f20]">
            {controlMode === "laptop" ? "Press E / Enter" : "Tap to open"}
          </span>
        </button>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm">
          <aside className="h-full w-full max-w-sm border-r-[6px] border-[#5f2f20] bg-[#f2bd6b] p-5 shadow-[10px_0_0_rgba(47,37,48,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-5xl font-black leading-none text-[#8f3f3a] drop-shadow-[3px_4px_0_#5f2f20]">
                Menu
              </h2>
              <button
                aria-label="Close menu"
                className="grid h-12 w-12 place-items-center border-[4px] border-[#5f2f20] bg-[#fff0b9]"
                onClick={onCloseDrawer}
                type="button"
              >
                <X aria-hidden size={24} strokeWidth={3} />
              </button>
            </div>
            <nav className="mt-8 grid gap-4">
              <Link className="game-menu-item" href="/">
                <Home aria-hidden size={24} strokeWidth={3} />
                Start Screen
              </Link>
              {drawerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button className="game-menu-item" key={item.id} onClick={() => onOpenModal(item.id)} type="button">
                    <Icon aria-hidden size={24} strokeWidth={3} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SceneBackdrop({ scene }: { scene: Scene }) {
  if (scene.id === "inside") {
    return (
      <div className="absolute inset-0 bg-[#c57d55]">
        <Image
          alt=""
          className="absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
          fill
          priority
          src="/art/world_house_backgroud.png"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#76bd62]">
      <Image
        alt=""
        className="absolute inset-0 h-full w-full select-none object-fill"
        draggable={false}
        fill
        priority
        src="/art/world_background.png"
        style={{ imageRendering: "pixelated" }}
        unoptimized
      />
    </div>
  );
}

function SceneForegroundOverlay({ scene, behindPlayer = false }: { scene: Scene; behindPlayer?: boolean }) {
  if (scene.id === "inside") {
    return (
      <div className={behindPlayer ? "pointer-events-none absolute inset-0 z-[25]" : "pointer-events-none absolute inset-0 z-[35]"}>
        <Image
          alt=""
          className="absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
          fill
          priority
          src="/art/world_house_backgroud_ontop.png"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
        <Image
          alt=""
          className="world-house-glow world-house-glow-table absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
          fill
          priority
          src="/art/world_house_backgroud_ontop_glow_table.png"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
        <Image
          alt=""
          className="world-house-glow world-house-glow-art absolute inset-0 h-full w-full select-none object-fill"
          draggable={false}
          fill
          priority
          src="/art/world_house_backgroud_ontop_glow_art.png"
          style={{ imageRendering: "pixelated" }}
          unoptimized
        />
      </div>
    );
  }

  if (scene.id !== "outside") {
    return null;
  }

  return (
    <div className={behindPlayer ? "pointer-events-none absolute inset-0 z-[25]" : "pointer-events-none absolute inset-0 z-[35]"}>
      <Image
        alt=""
        className="absolute inset-0 h-full w-full select-none object-fill"
        draggable={false}
        fill
        priority
        src="/art/world_background_ontop.png"
        style={{ imageRendering: "pixelated" }}
        unoptimized
      />
    </div>
  );
}

function DebugEditorOverlay({
  activeLayer,
  cameraScale,
  scene,
  sceneSize,
  selected,
  shapeKind,
  onSelect,
  onUpdateScene
}: {
  activeLayer: EditorLayer;
  cameraScale: number;
  scene: Scene;
  sceneSize: { width: number; height: number };
  selected: EditorSelection;
  shapeKind: EditorShape;
  onSelect: (selection: EditorSelection) => void;
  onUpdateScene: (updater: (currentScene: Scene) => Scene) => void;
}) {
  const draftRef = useRef<EditorDraft | null>(null);

  function eventToWorldPoint(event: React.PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return roundPoint({
      x: Math.max(0, Math.min((event.clientX - rect.left) / cameraScale, sceneSize.width)),
      y: Math.max(0, Math.min((event.clientY - rect.top) / cameraScale, sceneSize.height))
    });
  }

  function updateShape(layer: EditorLayer, id: string, nextShape: EditableShape) {
    onUpdateScene((currentScene) => replaceSceneShape(currentScene, layer, id, nextShape));
  }

  function getShapeById(layer: EditorLayer, id: string) {
    return getSceneShapes(scene, layer).find((shape) => shape.id === id) ?? null;
  }

  function hitTestHandle(point: Point) {
    if (!selected) {
      return null;
    }

    const shape = getShapeById(selected.layer, selected.id);

    if (!shape) {
      return null;
    }

    return getResizeHandles(shapeToBounds(shape)).find((handle) => pointInBounds(point, { x: handle.x, y: handle.y, width: 14, height: 14 })) ?? null;
  }

  function hitTestShape(point: Point) {
    const shapes = getSceneShapes(scene, activeLayer);

    for (let index = shapes.length - 1; index >= 0; index -= 1) {
      if (pointInShape(point, shapes[index])) {
        return shapes[index];
      }
    }

    return null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const point = eventToWorldPoint(event);
    const handle = hitTestHandle(point);
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    if (handle && selected) {
      const shape = getShapeById(selected.layer, selected.id);

      if (shape) {
        draftRef.current = {
          mode: "resize",
          layer: selected.layer,
          id: selected.id,
          handle: handle.id,
          originalBounds: shapeToBounds(shape)
        };
      }

      return;
    }

    const hitShape = hitTestShape(point);

    if (hitShape) {
      onSelect({ layer: activeLayer, id: hitShape.id });
      draftRef.current = {
        mode: "move",
        layer: activeLayer,
        id: hitShape.id,
        start: point,
        original: hitShape
      };
      return;
    }

    const allIds = new Set(scene.collisions.map((shape) => shape.id).concat((scene.walkableAreas ?? []).map((shape) => shape.id), scene.depthZones.map((zone) => zone.id)));
    const id = buildShapeId(activeLayer, allIds);
    const nextShape = boundsToShape(id, { x: point.x, y: point.y, width: 1, height: 1 }, activeLayer, activeLayer === "depthZones" ? "rect" : shapeKind);

    onUpdateScene((currentScene) => addSceneShape(currentScene, activeLayer, nextShape));
    onSelect({ layer: activeLayer, id });
    draftRef.current = {
      mode: "draw",
      layer: activeLayer,
      id,
      start: point
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const draft = draftRef.current;

    if (!draft || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const point = eventToWorldPoint(event);

    if (draft.mode === "draw") {
      updateShape(draft.layer, draft.id, boundsToShape(draft.id, { x: draft.start.x, y: draft.start.y, width: point.x - draft.start.x, height: point.y - draft.start.y }, draft.layer, draft.layer === "depthZones" ? "rect" : shapeKind));
      return;
    }

    if (draft.mode === "move") {
      updateShape(draft.layer, draft.id, moveShape(draft.original, { x: point.x - draft.start.x, y: point.y - draft.start.y }));
      return;
    }

    const nextBounds = resizeBounds(draft.originalBounds, draft.handle, point);
    const currentShape = getShapeById(draft.layer, draft.id);
    const nextKind = currentShape && "shape" in currentShape && currentShape.shape === "ellipse" ? "ellipse" : "rect";

    updateShape(draft.layer, draft.id, boundsToShape(draft.id, nextBounds, draft.layer, nextKind));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    draftRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const selectedShape = selected ? getShapeById(selected.layer, selected.id) : null;
  const selectedBounds = selectedShape ? shapeToBounds(selectedShape) : null;

  return (
    <div
      className="absolute inset-0 z-[38] cursor-crosshair select-none"
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {scene.collisions.map((collision, index) =>
        isEllipseCollision(collision) ? (
          <div
            className={`pointer-events-none absolute rounded-full border-4 ${selected?.layer === "collisions" && selected.id === collision.id ? "border-white bg-red-500/35 outline outline-4 outline-red-700" : "border-red-700 bg-red-500/20"}`}
            key={`${collision.id}-${index}`}
            style={{ left: collision.cx - collision.rx, top: collision.cy - collision.ry, width: collision.rx * 2, height: collision.ry * 2 }}
          />
        ) : (
          <div
            className={`pointer-events-none absolute border-4 ${selected?.layer === "collisions" && selected.id === collision.id ? "border-white bg-red-500/35 outline outline-4 outline-red-700" : "border-red-700 bg-red-500/20"}`}
            key={`${collision.id}-${index}`}
            style={{ left: collision.x, top: collision.y, width: collision.width, height: collision.height }}
          />
        )
      )}
      {scene.hotspots.map((rect, index) => (
        <div
          className="pointer-events-none absolute border-4 border-blue-700 bg-blue-500/20"
          key={`${rect.id}-${index}`}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      ))}
      {(scene.walkableAreas ?? []).map((area, index) =>
        isEllipseCollision(area) ? (
          <div
            className={`pointer-events-none absolute rounded-full border-4 ${selected?.layer === "walkableAreas" && selected.id === area.id ? "border-white bg-green-400/25 outline outline-4 outline-green-700" : "border-green-700 bg-green-400/15"}`}
            key={`${area.id}-${index}`}
            style={{ left: area.cx - area.rx, top: area.cy - area.ry, width: area.rx * 2, height: area.ry * 2 }}
          />
        ) : (
          <div
            className={`pointer-events-none absolute border-4 ${selected?.layer === "walkableAreas" && selected.id === area.id ? "border-white bg-green-400/25 outline outline-4 outline-green-700" : "border-green-700 bg-green-400/15"}`}
            key={`${area.id}-${index}`}
            style={{ left: area.x, top: area.y, width: area.width, height: area.height }}
          />
        )
      )}
      {scene.depthZones.map((zone, index) => (
        <div
          className={`pointer-events-none absolute border-4 ${selected?.layer === "depthZones" && selected.id === zone.id ? "border-white bg-yellow-300/35 outline outline-4 outline-yellow-500" : "border-yellow-500 bg-yellow-300/20"}`}
          key={`${zone.id}-${index}`}
          style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
        />
      ))}
      {selectedBounds
        ? getResizeHandles(selectedBounds).map((handle) => (
            <div
              className="pointer-events-none absolute h-[14px] w-[14px] border-2 border-[#5f2f20] bg-white"
              key={handle.id}
              style={{ left: handle.x, top: handle.y }}
            />
          ))
        : null}
    </div>
  );
}
