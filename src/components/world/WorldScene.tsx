"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bug, FolderKanban, Home, Mail, Menu, Minus, Palette, Plus, UserRound, X } from "lucide-react";
import type { Hotspot, WorldData, WorldScene as Scene } from "@/lib/content";
import { getActiveHotspot } from "@/lib/hotspots";
import { clampPoint, isBlocked, isEllipseCollision } from "@/lib/collisions";
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
const LEGACY_SCENE_WIDTH = 1800;
const LEGACY_SCENE_HEIGHT = 1200;
const WORLD_SCENE_WIDTH = 1600;
const WORLD_SCENE_HEIGHT = 900;
const PETAL_COUNT = 16;

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

export function WorldScene({ data }: WorldSceneProps) {
  const [sceneId, setSceneId] = useState(data.scenes[0]?.id ?? "outside");
  const scene = useMemo(() => data.scenes.find((item) => item.id === sceneId) ?? data.scenes[0], [data.scenes, sceneId]);
  const [position, setPosition] = useState<Point>(scene.spawn);
  const positionRef = useRef<Point>(scene.spawn);
  const keysRef = useRef<PressedKeys>(emptyKeys);
  const keyOrderRef = useRef<Record<MoveDirection, number>>(emptyKeyOrder);
  const keyOrderCounterRef = useRef(0);
  const dragRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const animationElapsedRef = useRef(0);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [debug, setDebug] = useState(false);
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
      x: Math.max(0, Math.min(targetX, data.sceneSize.width - viewWidth)),
      y: Math.max(0, Math.min(targetY, data.sceneSize.height - viewHeight))
    };
  }, [cameraScale, data.sceneSize.height, data.sceneSize.width, effectiveViewport.height, effectiveViewport.width, position.x, position.y]);

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

  const setScene = useCallback(
    (nextSceneId: string) => {
      const nextScene = data.scenes.find((item) => item.id === nextSceneId);
      if (!nextScene) {
        return;
      }

      positionRef.current = nextScene.spawn;
      setPosition(nextScene.spawn);
      setSceneId(nextScene.id);
      setActiveModal(null);
      setMovingState(false);
      resetWalkAnimation();
    },
    [data.scenes, resetWalkAnimation, setMovingState]
  );

  const tryMove = useCallback(
    (current: Point, delta: Point) => {
      const nextX = clampPoint({ x: current.x + delta.x, y: current.y }, data.sceneSize, playerBounds);
      const xRect = { id: "player", x: nextX.x, y: nextX.y, width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT };
      const afterX = isBlocked(xRect, scene.collisions) ? current : nextX;

      const nextY = clampPoint({ x: afterX.x, y: afterX.y + delta.y }, data.sceneSize, playerBounds);
      const yRect = { id: "player", x: nextY.x, y: nextY.y, width: PLAYER_HITBOX_WIDTH, height: PLAYER_HITBOX_HEIGHT };

      return isBlocked(yRect, scene.collisions) ? afterX : nextY;
    },
    [data.sceneSize, playerBounds, scene.collisions]
  );

  const activateHotspot = useCallback(
    (hotspot: Hotspot) => {
      if (hotspot.targetScene) {
        setScene(hotspot.targetScene);
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

      if (direction && controlMode === "laptop") {
        const next = { ...keysRef.current, [direction]: pressed };
        event.preventDefault();

        if (pressed && !keysRef.current[direction]) {
          keyOrderCounterRef.current += 1;
          keyOrderRef.current = { ...keyOrderRef.current, [direction]: keyOrderCounterRef.current };
        }

        keysRef.current = next;
      }

      if (pressed && (key === "e" || key === "enter") && nearbyHotspot) {
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
  }, [activateHotspot, controlMode, nearbyHotspot]);

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

      if (!activeModal && !drawerOpen) {
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
  }, [activeModal, controlMode, drawerOpen, resetWalkAnimation, setFacingState, setMovingState, tryMove]);

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (controlMode !== "mobile" || event.pointerType === "mouse") {
      return;
    }

    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    dragRef.current = null;
  }

  function updateDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (controlMode !== "mobile" || event.pointerType === "mouse" || !event.currentTarget.hasPointerCapture(event.pointerId)) {
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
          width: data.sceneSize.width,
          height: data.sceneSize.height,
          transform: `translate3d(${-camera.x * cameraScale}px, ${-camera.y * cameraScale}px, 0) scale(${cameraScale})`
        }}
      >
        <SceneBackdrop scene={scene} />
        {scene.id === "outside" ? <FallingPetals petals={petalPool} sceneSize={data.sceneSize} /> : null}
        {scene.id === "outside" && playerInDepthZone ? <SceneForegroundOverlay scene={scene} behindPlayer /> : null}
        {debug ? <DebugOverlay scene={scene} /> : null}
        {scene.hotspots.map((hotspot) => (
          <button
            aria-label={hotspot.label}
            className="absolute z-20 border-4 border-transparent bg-transparent transition focus-visible:border-wheat"
            key={hotspot.id}
            onClick={(event) => {
              event.stopPropagation();
              activateHotspot(hotspot);
            }}
            style={{ transform: `translate3d(${hotspot.x}px, ${hotspot.y}px, 0)`, width: hotspot.width, height: hotspot.height }}
            type="button"
          />
        ))}
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
        {scene.id !== "outside" || !playerInDepthZone ? <SceneForegroundOverlay scene={scene} /> : null}
      </div>
      </div>

      <GameHud
        debug={debug}
        drawerOpen={drawerOpen}
        nearbyHotspot={nearbyHotspot}
        onActivateHotspot={() => nearbyHotspot && activateHotspot(nearbyHotspot)}
        onCloseDrawer={() => setDrawerOpen(false)}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenModal={(type) => {
          setDrawerOpen(false);
          setActiveModal(type);
        }}
        onToggleDebug={() => setDebug((value) => !value)}
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
          left: `${petal.left}%`,
          width: `${petal.size}px`,
          height: `${petal.size}px`,
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

function GameHud({
  debug,
  drawerOpen,
  nearbyHotspot,
  onActivateHotspot,
  onCloseDrawer,
  onOpenDrawer,
  onOpenModal,
  onToggleControlMode,
  onToggleDebug,
  onZoomIn,
  onZoomOut,
  controlMode,
  controlModeIsOverridden,
  sceneName,
  zoomInDisabled,
  zoomOutDisabled
}: {
  debug: boolean;
  drawerOpen: boolean;
  nearbyHotspot?: Hotspot;
  onActivateHotspot: () => void;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
  onOpenModal: (type: NonNullable<Hotspot["contentType"]>) => void;
  onToggleControlMode?: () => void;
  onToggleDebug: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  controlMode: ControlMode;
  controlModeIsOverridden: boolean;
  sceneName: string;
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
          className="pointer-events-auto hidden h-14 w-14 place-items-center border-[4px] border-[#5f2f20] bg-[#f6c879] shadow-[0_5px_0_#9a4f2f] sm:grid"
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

      {nearbyHotspot ? (
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
      <div className="absolute inset-0 overflow-hidden bg-[#c57d55]">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: LEGACY_SCENE_WIDTH,
            height: LEGACY_SCENE_HEIGHT,
            transform: `scale(${WORLD_SCENE_WIDTH / LEGACY_SCENE_WIDTH}, ${WORLD_SCENE_HEIGHT / LEGACY_SCENE_HEIGHT})`
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[150px] border-b-[6px] border-[#5f2f20] bg-[#9d563f]" />
          <div className="absolute inset-x-0 bottom-0 h-[120px] bg-[#b06c49]" />
          <div className="absolute left-[190px] top-[230px] h-[420px] w-[140px] border-[6px] border-[#5f2f20] bg-[#724931]" />
          <div className="absolute left-[360px] top-[250px] h-[220px] w-[390px] border-[6px] border-[#5f2f20] bg-[#7b5236]" />
          <div className="absolute left-[440px] top-[170px] h-[120px] w-[190px] border-[6px] border-[#5f2f20] bg-[#273048]" />
          <div className="absolute left-[1160px] top-[230px] h-[320px] w-[260px] border-[6px] border-[#5f2f20] bg-[#fff8dc]" />
          <div className="absolute left-[1215px] top-[295px] h-[145px] w-[150px] border-[5px] border-[#5f2f20] bg-[#9bd4d8]" />
          <div className="absolute left-[780px] top-[555px] h-[165px] w-[250px] border-[5px] border-[#5f2f20] bg-[#f2bd6b]" />
          <div className="absolute bottom-[70px] left-[810px] h-[170px] w-[220px] border-[6px] border-[#5f2f20] bg-[#e4c66d]" />
        </div>
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

function DebugOverlay({ scene }: { scene: Scene }) {
  return (
    <>
      {scene.collisions.map((collision) =>
        isEllipseCollision(collision) ? (
          <div
            className="pointer-events-none absolute z-40 rounded-full border-4 border-red-700 bg-red-500/20"
            key={collision.id}
            style={{ left: collision.cx - collision.rx, top: collision.cy - collision.ry, width: collision.rx * 2, height: collision.ry * 2 }}
          />
        ) : (
          <div
            className="pointer-events-none absolute z-40 border-4 border-red-700 bg-red-500/20"
            key={collision.id}
            style={{ left: collision.x, top: collision.y, width: collision.width, height: collision.height }}
          />
        )
      )}
      {scene.hotspots.map((rect) => (
        <div
          className="pointer-events-none absolute z-40 border-4 border-blue-700 bg-blue-500/20"
          key={rect.id}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      ))}
      {scene.depthZones.map((zone) => (
        <div
          className="pointer-events-none absolute z-40 border-4 border-yellow-500 bg-yellow-300/20"
          key={zone.id}
          style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
        />
      ))}
    </>
  );
}
