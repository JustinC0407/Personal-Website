"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Mail, Palette, Play, UserRound } from "lucide-react";
import { PortfolioModal, type PortfolioModalType } from "@/components/PortfolioModal";

const shortcuts = [
  { modal: "about", label: "About + Skills", icon: UserRound },
  { modal: "projects", label: "Projects", icon: FolderKanban },
  { modal: "creative", label: "Creative", icon: Palette },
  { modal: "contact", label: "Contact / Resume", icon: Mail }
] satisfies Array<{ modal: PortfolioModalType; label: string; icon: typeof UserRound }>;

export function StartScreen() {
  const [activeModal, setActiveModal] = useState<PortfolioModalType | null>(null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#62bee8]">
      <div aria-hidden className="start-clouds-bg absolute inset-0">
        <div className="start-clouds-strip">
          <span className="start-clouds-panel" />
          <span className="start-clouds-panel start-clouds-panel-reversed" />
          <span className="start-clouds-panel" />
          <span className="start-clouds-panel start-clouds-panel-reversed" />
        </div>
      </div>

      <div className="start-mountains-intro absolute inset-0 z-10">
        <Image
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none object-cover"
          fill
          priority
          sizes="100vw"
          src="/art/start-mountatins.png"
        />
      </div>

      <section className="start-sign-intro absolute inset-0 z-20 mx-auto flex min-h-screen max-w-[1500px] flex-col items-center justify-center px-4 py-5">
        <div className="relative w-full max-w-[1420px]">
            <div className="relative mx-auto aspect-[440/463] w-full max-w-[560px] text-center md:aspect-[480/292] md:max-w-[1260px]">
              <Image
                alt=""
                className="pointer-events-none select-none object-contain md:hidden"
                fill
                priority
                sizes="(max-width: 768px) 94vw"
                src="/art/start-sign-mobile.png"
              />
              <Image
                alt=""
                className="pointer-events-none hidden select-none object-contain md:block"
                fill
                priority
                sizes="(min-width: 768px) 1260px"
                src="/art/start-sign.png"
              />
              <div className="absolute inset-x-[15%] top-[21%] md:inset-x-[16%] md:top-[30%]">
                <p className="font-body text-sm font-black uppercase tracking-[0.12em] text-[#8f3f3a] sm:text-lg md:text-xl">Welcome to my world :)</p>
                <h1 className="mx-auto mt-1 max-w-4xl font-display text-[clamp(4rem,17vw,6.4rem)] font-black leading-[0.72] text-[#9a4f2f] drop-shadow-[4px_5px_0_#5f2f20] md:text-[clamp(3.2rem,9vw,8.7rem)]">
                  Justins Portfolio
                </h1>
                <Link
                  className="mx-auto mt-8 inline-flex min-h-14 min-w-[210px] items-center justify-center gap-3 rounded-sm border-[5px] border-[#5f2f20] bg-[#ffe09a] px-5 py-2 font-display text-2xl font-black text-[#8f3f3a] shadow-[0_7px_0_#9a4f2f] transition hover:-translate-y-1 hover:bg-[#fff0b9] hover:shadow-[0_10px_0_#9a4f2f] focus-visible:bg-[#fff0b9] sm:min-h-16 sm:min-w-[280px] sm:text-4xl md:mt-5"
                  href="/world"
                >
                  <Play aria-hidden fill="currentColor" size={30} />
                  Join the World
                </Link>
              </div>
            </div>

            <nav className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Direct portfolio popups">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button
                    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-sm border-[5px] border-[#5f2f20] bg-[#f6c879] px-4 py-3 text-center font-body text-xl font-black text-[#8f3f3a] shadow-[0_6px_0_#9a4f2f] transition hover:-translate-y-1 hover:bg-[#ffe09a] hover:shadow-[0_9px_0_#9a4f2f]"
                    key={shortcut.modal}
                    onClick={() => setActiveModal(shortcut.modal)}
                    type="button"
                  >
                    <Icon aria-hidden size={24} strokeWidth={3} />
                    {shortcut.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </section>
      {activeModal ? <PortfolioModal type={activeModal} onClose={() => setActiveModal(null)} /> : null}
    </main>
  );
}
