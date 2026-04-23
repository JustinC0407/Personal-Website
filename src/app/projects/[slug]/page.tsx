import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Github } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug, projectContent } from "@/lib/content";

type ProjectDetailProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return projectContent.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  return {
    title: project?.title ?? "Project"
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const links = [
    { label: "GitHub", href: project.links.github, icon: Github },
    { label: "Live Demo", href: project.links.demo, icon: ExternalLink },
    { label: "Website", href: project.links.website, icon: ExternalLink },
    { label: "Case Study", href: project.links.caseStudy, icon: ExternalLink }
  ].filter((link) => link.href);

  return (
    <main>
      <PageHeader description={project.shortDescription} eyebrow="Project Detail" title={project.title} />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_340px]">
        <article className="pixel-panel overflow-hidden">
          <Image alt="" className="h-72 w-full border-b-4 border-ink object-cover" height={360} src={project.thumbnail} width={900} />
          <div className="grid gap-7 p-6 md:p-8">
            <section>
              <h2 className="font-display text-2xl font-black">Overview</h2>
              <p className="mt-3 leading-8 text-ink/80">{project.longDescription}</p>
            </section>
            <section>
              <h2 className="font-display text-2xl font-black">Why It Matters</h2>
              <p className="mt-3 leading-8 text-ink/80">{project.whyItMatters}</p>
            </section>
          </div>
        </article>
        <aside className="grid content-start gap-5">
          <section className="pixel-panel p-5">
            <h2 className="font-display text-2xl font-black">Stack</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span className="border-2 border-ink bg-white px-3 py-2 text-sm font-bold" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
          </section>
          {links.length > 0 ? (
            <section className="pixel-panel p-5">
              <h2 className="font-display text-2xl font-black">Links</h2>
              <div className="mt-4 grid gap-3">
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a className="pixel-button inline-flex items-center gap-2 px-4 py-3" href={link.href} key={link.label}>
                      <Icon aria-hidden size={18} />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
