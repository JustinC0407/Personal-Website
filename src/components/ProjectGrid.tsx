import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Github } from "lucide-react";
import type { Project } from "@/lib/content";

type ProjectGridProps = {
  projects: Project[];
};

export function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <article className="pixel-panel flex flex-col overflow-hidden" key={project.id}>
          <Link className="block border-b-4 border-ink bg-meadow" href={`/projects/${project.slug}`}>
            <Image alt="" className="h-44 w-full object-cover" height={220} src={project.thumbnail} width={420} />
          </Link>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl font-black leading-tight">
                <Link href={`/projects/${project.slug}`}>{project.title}</Link>
              </h2>
              {project.featured ? (
                <span className="border-2 border-ink bg-wheat px-2 py-1 text-xs font-black uppercase">Featured</span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/75">{project.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span className="border-2 border-ink bg-white px-2 py-1 text-xs font-bold" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-auto flex flex-wrap gap-3 pt-5">
              <Link className="font-display text-sm font-black underline underline-offset-4" href={`/projects/${project.slug}`}>
                Case study
              </Link>
              {project.links.github ? (
                <a className="inline-flex items-center gap-1 text-sm font-bold" href={project.links.github}>
                  <Github aria-hidden size={16} />
                  GitHub
                </a>
              ) : null}
              {project.links.demo ? (
                <a className="inline-flex items-center gap-1 text-sm font-bold" href={project.links.demo}>
                  <ExternalLink aria-hidden size={16} />
                  Demo
                </a>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
