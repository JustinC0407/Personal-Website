import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollisionShape, Rect, WorldData } from "@/lib/content";

function isNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isRect(value: unknown): value is Rect {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rect = value as Rect;
  return typeof rect.id === "string" && isNumber(rect.x) && isNumber(rect.y) && isNumber(rect.width) && isNumber(rect.height);
}

function isCollisionShape(value: unknown): value is CollisionShape {
  if (!value || typeof value !== "object") {
    return false;
  }

  const shape = value as CollisionShape;

  if (shape.shape === "rect") {
    return isRect(shape);
  }

  return (
    shape.shape === "ellipse" &&
    typeof shape.id === "string" &&
    isNumber(shape.cx) &&
    isNumber(shape.cy) &&
    isNumber(shape.rx) &&
    isNumber(shape.ry)
  );
}

function isWorldData(value: unknown): value is WorldData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as WorldData;

  return (
    !!data.sceneSize &&
    isNumber(data.sceneSize.width) &&
    isNumber(data.sceneSize.height) &&
    Array.isArray(data.scenes) &&
    data.scenes.every(
      (scene) =>
        typeof scene.id === "string" &&
        typeof scene.name === "string" &&
        typeof scene.background === "string" &&
        !!scene.spawn &&
        isNumber(scene.spawn.x) &&
        isNumber(scene.spawn.y) &&
        Array.isArray(scene.collisions) &&
        scene.collisions.every(isCollisionShape) &&
        (scene.walkableAreas === undefined || (Array.isArray(scene.walkableAreas) && scene.walkableAreas.every(isCollisionShape))) &&
        Array.isArray(scene.depthZones) &&
        scene.depthZones.every(isRect) &&
        Array.isArray(scene.hotspots)
    )
  );
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "World editor saves are disabled in production." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as unknown;

  if (!isWorldData(body)) {
    return NextResponse.json({ error: "Invalid world data." }, { status: 400 });
  }

  const worldPath = path.join(process.cwd(), "src", "data", "world.json");
  await writeFile(worldPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");

  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "World editor reads are disabled in production." }, { status: 403 });
  }

  const worldPath = path.join(process.cwd(), "src", "data", "world.json");
  const file = await readFile(worldPath, "utf8");
  const data = JSON.parse(file) as unknown;

  if (!isWorldData(data)) {
    return NextResponse.json({ error: "Invalid world data on disk." }, { status: 500 });
  }

  return NextResponse.json(data);
}
