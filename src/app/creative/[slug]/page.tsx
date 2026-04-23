import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { creativeContent, getCreativeBySlug } from "@/lib/content";

type CreativeDetailProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return creativeContent.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: CreativeDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const work = getCreativeBySlug(slug);

  return {
    title: work?.title ?? "Creative Work"
  };
}

export default async function CreativeDetailPage({ params }: CreativeDetailProps) {
  const { slug } = await params;
  const work = getCreativeBySlug(slug);

  if (!work) {
    notFound();
  }

  return (
    <main>
      <PageHeader description={work.description} eyebrow={`${work.medium} / ${work.year}`} title={work.title} />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <article className="pixel-panel overflow-hidden">
          <div className="grid gap-4 border-b-4 border-ink bg-meadow p-4 md:grid-cols-2">
            {work.images.map((image) => (
              <Image alt="" className="h-72 w-full border-4 border-ink object-cover" height={360} key={image} src={image} width={520} />
            ))}
          </div>
          <div className="p-6 md:p-8">
            <h2 className="font-display text-2xl font-black">Context</h2>
            <p className="mt-3 leading-8 text-ink/80">{work.description}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
