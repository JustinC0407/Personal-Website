"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bug, FolderKanban, Home, Mail, Menu, Minus, Palette, Plus, UserRound, X } from "lucide-react";
import type { Hotspot, WorldData, WorldScene as Scene } from "@/lib/content";
import { getActiveHotspot } from "@/lib/hotspots";
import { clampPoint, isBlocked } from "@/lib/collisions";
import { PortfolioModal } from "@/components/PortfolioModal";

const PLAYER_SIZE = 48;
const PLAYER_SPEED = 230;
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

type PressedKeys = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

const emptyKeys: PressedKeys = {
  up: false,
  down: false,
  left: false,
  right: false
};

const drawerItems = [
  { id: "about", label: "About + Skills", icon: UserRound },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "contact", label: "Contact / Resume", icon: Mail }
] as const;

export function WorldScene({ data }: WorldSceneProps) {
  const [sceneId, setSceneId] = useState(data.scenes[0]?.id ?? "outside");
  const scene = useMemo(() => data.scenes.find((item) => item.id === sceneId) ?? data.scenes[0], [data.scenes, sceneId]);
  const [position, setPosition] = useState<Point>(scene.spawn);
  const positionRef = useRef<Point>(scene.spawn);
  const keysRef = useRef<PressedKeys>(emptyKeys);
  const dragRef = useRef<Point | null>(null);
  const dragOriginRef = useRef<Point | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [debug, setDebug] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<Hotspot["contentType"] | null>(null);
  const [cameraScale, setCameraScale] = useState(DEFAULT_CAMERA_SCALE);
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

  const playerRect = useMemo(
    () => ({ id: "player", x: position.x, y: position.y, width: PLAYER_SIZE, height: PLAYER_SIZE }),
    [position]
  );
  const nearbyHotspot = useMemo(() => getActiveHotspot(playerRect, scene.hotspots), [playerRect, scene.hotspots]);

  const camera = useMemo(() => {
    const viewWidth = effectiveViewport.width / cameraScale;
    const viewHeight = effectiveViewport.height / cameraScale;
    const targetX = position.x + PLAYER_SIZE / 2 - viewWidth / 2;
    const targetY = position.y + PLAYER_SIZE / 2 - viewHeight / 2;

    return {
      x: Math.max(0, Math.min(targetX, data.sceneSize.width - viewWidth)),
      y: Math.max(0, Math.min(targetY, data.sceneSize.height - viewHeight))
    };
  }, [cameraScale, data.sceneSize.height, data.sceneSize.width, effectiveViewport.height, effectiveViewport.width, position.x, position.y]);

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
    },
    [data.scenes]
  );

  const tryMove = useCallback(
    (current: Point, delta: Point) => {
      const nextX = clampPoint({ x: current.x + delta.x, y: current.y }, data.sceneSize, PLAYER_SIZE);
      const xRect = { id: "player", x: nextX.x, y: nextX.y, width: PLAYER_SIZE, height: PLAYER_SIZE };
      const afterX = isBlocked(xRect, scene.collisions) ? current : nextX;

      const nextY = clampPoint({ x: afterX.x, y: afterX.y + delta.y }, data.sceneSize, PLAYER_SIZE);
      const yRect = { id: "player", x: nextY.x, y: nextY.y, width: PLAYER_SIZE, height: PLAYER_SIZE };

      return isBlocked(yRect, scene.collisions) ? afterX : nextY;
    },
    [data.sceneSize, scene.collisions]
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
      const next = { ...keysRef.current };
      let handled = true;

      if (key === "w" || key === "arrowup") next.up = pressed;
      else if (key === "s" || key === "arrowdown") next.down = pressed;
      else if (key === "a" || key === "arrowleft") next.left = pressed;
      else if (key === "d" || key === "arrowright") next.right = pressed;
      else handled = false;

      if (handled && controlMode === "laptop") {
        event.preventDefault();
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
    dragRef.current = null;
    dragOriginRef.current = null;
  }, [controlMode]);

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

        if (controlMode === "mobile" && dragRef.current) {
          dx += dragRef.current.x;
          dy += dragRef.current.y;
        }

        const magnitude = Math.hypot(dx, dy);

        if (magnitude > 0) {
          const normalized = { x: dx / magnitude, y: dy / magnitude };
          const next = tryMove(positionRef.current, {
            x: normalized.x * PLAYER_SPEED * deltaSeconds,
            y: normalized.y * PLAYER_SPEED * deltaSeconds
          });

          positionRef.current = next;
          setPosition(next);
        }
      }

      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activeModal, controlMode, drawerOpen, tryMove]);

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
          className="absolute z-30 grid place-items-center rounded-sm border-4 border-[#1d2332] bg-[#2d68b8] font-display text-lg font-black text-white shadow-[5px_6px_0_rgba(30,25,28,0.35)]"
          style={{
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`
          }}
        >
          JC
        </div>
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
      <div className="absolute inset-0 bg-[#c57d55]">
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
    );
  }

  return (
    <div className="absolute inset-0 bg-[#76bd62]">
      <div className="absolute inset-x-0 top-0 h-[120px] border-b-[6px] border-[#2d5f34] bg-[#416f3d]" />
      <div className="absolute left-0 top-0 h-full w-[150px] bg-[#416f3d]" />
      <div className="absolute right-0 top-0 h-full w-[150px] bg-[#416f3d]" />
      <div className="absolute inset-x-0 bottom-0 h-[80px] border-t-[6px] border-[#5f2f20] bg-[#9a6b3f]" />
      <div className="absolute left-[780px] top-[600px] h-[520px] w-[150px] bg-[#d8b55d]" />
      <div className="absolute left-[940px] top-[275px] h-[300px] w-[430px] border-[6px] border-[#5f2f20] bg-[#b8684b]" />
      <div className="absolute left-[900px] top-[180px] h-0 w-0 border-x-[255px] border-b-[120px] border-x-transparent border-b-[#8f3f3a]" />
      <div className="absolute left-[1070px] top-[500px] h-[90px] w-[95px] border-[6px] border-[#5f2f20] bg-[#e4c66d]" />
      <div className="absolute left-[265px] top-[660px] h-[165px] w-[260px] rounded-[45%] border-[6px] border-[#2d5f76] bg-[#6fb6c9]" />
      <div className="absolute left-[625px] top-[570px] h-[105px] w-[90px] border-[6px] border-[#5f2f20] bg-[#fff8dc]" />
      <div className="absolute left-[660px] top-[675px] h-[70px] w-[14px] bg-[#5f2f20]" />
      <div className="absolute left-[1245px] top-[665px] h-[85px] w-[92px] border-[6px] border-[#5f2f20] bg-[#d45a66]" />
      <div className="absolute left-[1284px] top-[750px] h-[60px] w-[14px] bg-[#5f2f20]" />
      <div className="absolute left-[590px] top-[900px] h-[130px] w-[240px] border-[5px] border-[#5f2f20] bg-[#5c9a47]" />
      <div className="absolute left-[1010px] top-[900px] h-[130px] w-[260px] border-[5px] border-[#5f2f20] bg-[#5c9a47]" />
    </div>
  );
}

function DebugOverlay({ scene }: { scene: Scene }) {
  return (
    <>
      {scene.collisions.map((rect) => (
        <div
          className="pointer-events-none absolute z-40 border-4 border-red-700 bg-red-500/20"
          key={rect.id}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      ))}
      {scene.hotspots.map((rect) => (
        <div
          className="pointer-events-none absolute z-40 border-4 border-blue-700 bg-blue-500/20"
          key={rect.id}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      ))}
    </>
  );
}
