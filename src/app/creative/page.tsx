import type { Metadata } from "next";
import { CreativeGrid } from "@/components/CreativeGrid";
import { PageHeader } from "@/components/PageHeader";
import { creativeContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Creative Works"
};

export default function CreativePage() {
  return (
    <main>
      <PageHeader
        description="A gallery of visual experiments, creative work, and portfolio-world art placeholders."
        eyebrow="Gallery"
        title="Creative Works"
      />
      <section className="mx-auto max-w-7xl px-5 py-10">
        <CreativeGrid works={creativeContent} />
      </section>
    </main>
  );
}
