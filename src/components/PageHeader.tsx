type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="border-b-4 border-ink bg-sky">
      <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        {eyebrow ? (
          <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-brick">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-black leading-tight md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/80">{description}</p>
      </div>
    </section>
  );
}
