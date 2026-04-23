import type { Metadata } from "next";
import { WorldScene } from "@/components/world/WorldScene";
import { worldContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Interactive World"
};

export default function WorldPage() {
  return (
    <main className="bg-[#d7e7a0]">
      <WorldScene data={worldContent} />
    </main>
  );
}
