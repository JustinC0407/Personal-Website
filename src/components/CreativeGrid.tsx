import Link from "next/link";
import Image from "next/image";
import type { CreativeWork } from "@/lib/content";

type CreativeGridProps = {
  works: CreativeWork[];
};

export function CreativeGrid({ works }: CreativeGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {works.map((work) => (
        <Link className="pixel-panel block overflow-hidden transition hover:-translate-y-1" href={`/creative/${work.slug}`} key={work.id}>
          <Image alt="" className="h-56 w-full border-b-4 border-ink object-cover" height={260} src={work.thumbnail} width={420} />
          <div className="p-5">
            <h2 className="font-display text-2xl font-black">{work.title}</h2>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-brick">
              {work.medium} / {work.year}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink/75">{work.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
