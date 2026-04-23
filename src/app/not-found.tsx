import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 text-center">
      <div className="pixel-panel p-8">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-clay">404</p>
        <h1 className="mt-3 font-display text-3xl font-black">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-ink/80">
          This path is outside the mapped portfolio world.
        </p>
        <Link className="pixel-button mt-6 inline-flex px-5 py-3" href="/">
          Return Home
        </Link>
      </div>
    </main>
  );
}
