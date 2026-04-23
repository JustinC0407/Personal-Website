"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Home, Mail, Map, Palette, UserRound, Wrench } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/world", label: "World", icon: Map },
  { href: "/about", label: "About", icon: UserRound },
  { href: "/skills-education", label: "Skills", icon: Wrench },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/creative", label: "Creative", icon: Palette },
  { href: "/contact", label: "Contact", icon: Mail }
];

export function Navbar() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/world") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-paper/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-3">
        <Link className="mr-2 shrink-0 font-display text-lg font-black" href="/">
          Pixel Portfolio
        </Link>
        <div className="flex min-w-max gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="inline-flex items-center gap-2 border-2 border-ink bg-white/70 px-3 py-2 font-display text-xs font-black uppercase text-ink transition hover:bg-wheat focus-visible:bg-wheat"
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden size={16} strokeWidth={2.5} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
