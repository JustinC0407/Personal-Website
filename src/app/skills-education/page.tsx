import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { skillsEducationContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Skills + Education"
};

export default function SkillsEducationPage() {
  return (
    <main>
      <PageHeader
        description="Technical skills, tools, education, coursework, and focus areas presented for quick recruiter scanning."
        eyebrow="Inventory"
        title="Skills + Education"
      />
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5 md:grid-cols-2">
          {skillsEducationContent.skills.map((group) => (
            <article className="pixel-panel p-5" key={group.category}>
              <h2 className="font-display text-2xl font-black">{group.category}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span className="border-2 border-ink bg-white px-3 py-2 text-sm font-bold" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="grid gap-5">
          <section className="pixel-panel p-5">
            <h2 className="font-display text-2xl font-black">Education</h2>
            {skillsEducationContent.education.map((item) => (
              <div className="mt-4" key={`${item.school}-${item.degree}`}>
                <p className="font-bold">{item.school}</p>
                <p className="text-sm text-ink/75">{item.degree}</p>
                <p className="text-sm text-ink/65">{item.period}</p>
                <p className="mt-2 text-sm leading-6">{item.details}</p>
              </div>
            ))}
          </section>
          <section className="pixel-panel p-5">
            <h2 className="font-display text-2xl font-black">Coursework</h2>
            <ul className="mt-4 grid gap-2">
              {skillsEducationContent.coursework.map((course) => (
                <li className="border-2 border-ink bg-meadow px-3 py-2 text-sm font-bold" key={course}>
                  {course}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
