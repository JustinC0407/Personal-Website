import { aboutContent, skillsEducationContent } from "@/lib/content";

export function ProfilePanel() {
  return (
    <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="pixel-panel p-5">
        <div className="grid aspect-square place-items-center border-4 border-ink bg-meadow">
          <div className="grid h-32 w-32 place-items-center border-4 border-ink bg-paper font-display text-5xl font-black">
            JC
          </div>
        </div>
        <h2 className="mt-5 font-display text-3xl font-black">{aboutContent.name}</h2>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-brick">{aboutContent.title}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {aboutContent.highlights.map((highlight) => (
            <span className="border-2 border-ink bg-wheat px-2 py-1 text-xs font-bold" key={highlight}>
              {highlight}
            </span>
          ))}
        </div>
      </aside>

      <div className="pixel-panel p-5 md:p-7">
        <div className="grid gap-5">
          {aboutContent.bio.map((paragraph) => (
            <p className="text-base leading-8 text-ink/85" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="font-display text-xl font-black">Education</h3>
            {skillsEducationContent.education.map((item) => (
              <div className="mt-3 border-l-4 border-clay pl-4" key={`${item.school}-${item.degree}`}>
                <p className="font-bold">{item.school}</p>
                <p className="text-sm text-ink/75">{item.degree}</p>
                <p className="text-sm text-ink/65">{item.period}</p>
                <p className="mt-2 text-sm leading-6 text-ink/75">{item.details}</p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="font-display text-xl font-black">Focus Areas</h3>
            <ul className="mt-3 grid gap-2">
              {skillsEducationContent.focusAreas.map((area) => (
                <li className="border-2 border-ink bg-white px-3 py-2 text-sm font-semibold" key={area}>
                  {area}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
