"use client";

import { X } from "lucide-react";
import type { Project } from "@/lib/content";
import { aboutContent, contactContent, creativeContent, projectContent, skillsEducationContent } from "@/lib/content";

export type PortfolioModalType = "about" | "projects" | "creative" | "contact";

type PortfolioModalProps = {
  onClose: () => void;
  type: PortfolioModalType;
};

export function PortfolioModal({ onClose, type }: PortfolioModalProps) {
  const title = {
    about: "About + Skills",
    projects: "Projects",
    creative: "Creative Works",
    contact: "Contact / Resume"
  }[type];

  return (
    <div className="fixed inset-0 z-50 grid bg-ink/50 p-4 backdrop-blur-md md:p-8" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden border-[6px] border-[#5f2f20] bg-[#fff0b9] shadow-[0_10px_0_#9a4f2f] md:h-[calc(100vh-4rem)]">
        <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b-[5px] border-[#5f2f20] bg-[#f2bd6b] px-5 py-4">
          <h2 className="font-display text-5xl font-black leading-none text-[#8f3f3a] drop-shadow-[3px_4px_0_#5f2f20] md:text-7xl">
            {title}
          </h2>
          <button
            aria-label="Close popup"
            className="grid h-12 w-12 shrink-0 place-items-center border-[4px] border-[#5f2f20] bg-[#fff0b9] text-[#5f2f20]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden size={26} strokeWidth={3} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
          {type === "about" ? <AboutModalContent /> : null}
          {type === "projects" ? <ProjectsModalContent /> : null}
          {type === "creative" ? <CreativeModalContent /> : null}
          {type === "contact" ? <ContactModalContent /> : null}
        </div>
      </div>
    </div>
  );
}

function AboutModalContent() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="border-[5px] border-[#5f2f20] bg-[#77bd61] p-4">
          <div className="grid aspect-square place-items-center border-[5px] border-[#5f2f20] bg-[#fff8dc] font-display text-7xl font-black text-[#8f3f3a]">
            JC
          </div>
          <h3 className="mt-4 font-display text-4xl font-black text-[#8f3f3a]">{aboutContent.name}</h3>
          <p className="mt-2 font-body text-xl font-black leading-7 text-[#5f2f20]">{aboutContent.title}</p>
        </div>
        <div className="grid gap-4 border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5">
          {aboutContent.bio.map((paragraph) => (
            <p className="font-body text-2xl leading-9 text-[#5f2f20]" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        {skillsEducationContent.skills.map((group) => (
          <article className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5" key={group.category}>
            <h3 className="font-display text-4xl font-black text-[#8f3f3a]">{group.category}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span className="border-[3px] border-[#5f2f20] bg-[#f6c879] px-3 py-2 font-body text-xl font-black" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5">
        <h3 className="font-display text-4xl font-black text-[#8f3f3a]">Education</h3>
        {skillsEducationContent.education.map((item) => (
          <div className="mt-4 font-body text-2xl leading-8 text-[#5f2f20]" key={`${item.school}-${item.degree}`}>
            <p className="font-black">{item.school}</p>
            <p>{item.degree}</p>
            <p>{item.period}</p>
            <p className="mt-2">{item.details}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function ProjectsModalContent() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {projectContent.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const links = [
    ["GitHub", project.links.github],
    ["Demo", project.links.demo],
    ["Website", project.links.website],
    ["Case Study", project.links.caseStudy]
  ].filter((link): link is [string, string] => Boolean(link[1]));

  return (
    <article className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5">
      <h3 className="font-display text-4xl font-black leading-none text-[#8f3f3a]">{project.title}</h3>
      <p className="mt-4 font-body text-2xl leading-8 text-[#5f2f20]">{project.longDescription}</p>
      <p className="mt-4 font-body text-xl font-black leading-7 text-[#5f2f20]">{project.whyItMatters}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.tech.map((tech) => (
          <span className="border-[3px] border-[#5f2f20] bg-[#f6c879] px-3 py-2 font-body text-lg font-black" key={tech}>
            {tech}
          </span>
        ))}
      </div>
      {links.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {links.map(([label, href]) => (
            <a className="border-[4px] border-[#5f2f20] bg-[#f2bd6b] px-4 py-2 font-body text-xl font-black" href={href} key={label}>
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CreativeModalContent() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {creativeContent.map((work) => (
        <article className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5" key={work.id}>
          <div className="aspect-[4/3] border-[4px] border-[#5f2f20] bg-[#77bd61]" />
          <h3 className="mt-4 font-display text-4xl font-black leading-none text-[#8f3f3a]">{work.title}</h3>
          <p className="mt-2 font-body text-xl font-black text-[#5f2f20]">
            {work.medium} / {work.year}
          </p>
          <p className="mt-3 font-body text-xl leading-7 text-[#5f2f20]">{work.description}</p>
        </article>
      ))}
    </div>
  );
}

function ContactModalContent() {
  const links = [
    ["Email", `mailto:${contactContent.email}`, contactContent.email],
    ["LinkedIn", contactContent.linkedin, "Open LinkedIn"],
    ["GitHub", contactContent.github, "Open GitHub"],
    ["Resume", contactContent.resume, "View Resume"]
  ];

  return (
    <div className="grid gap-6">
      <p className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5 font-body text-2xl leading-9 text-[#5f2f20]">
        {contactContent.availability}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map(([label, href, value]) => (
          <a className="border-[5px] border-[#5f2f20] bg-[#fff8dc] p-5 transition hover:bg-[#f6c879]" href={href} key={label}>
            <h3 className="font-display text-4xl font-black text-[#8f3f3a]">{label}</h3>
            <p className="mt-2 break-words font-body text-2xl font-black text-[#5f2f20]">{value}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
