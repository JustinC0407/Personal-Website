import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProjectGrid } from "@/components/ProjectGrid";
import { projectContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects"
};

export default function ProjectsPage() {
  const featured = projectContent.filter((project) => project.featured);

  return (
    <main>
      <PageHeader
        description="Technical projects with short summaries, stack information, links, and detail pages for deeper context."
        eyebrow="Build Log"
        title="Technical Projects"
      />
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-black">Featured</h2>
          <p className="mt-2 max-w-2xl text-ink/75">High-signal work appears first, with every project still available in the full grid.</p>
        </div>
        <ProjectGrid projects={featured.length > 0 ? featured : projectContent} />
        {featured.length !== projectContent.length ? (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-3xl font-black">All Projects</h2>
            <ProjectGrid projects={projectContent} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
