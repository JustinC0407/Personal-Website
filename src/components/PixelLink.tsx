import Link from "next/link";
import type { ComponentType } from "react";

type PixelLinkProps = {
  href: string;
  children: React.ReactNode;
  icon?: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  variant?: "primary" | "secondary";
};

export function PixelLink({ href, children, icon: Icon, variant = "primary" }: PixelLinkProps) {
  const classes =
    variant === "primary"
      ? "pixel-button inline-flex items-center justify-center gap-2 px-5 py-3"
      : "inline-flex items-center justify-center gap-2 border-[3px] border-ink bg-white px-5 py-3 font-display font-black shadow-[4px_4px_0_#6b4a42] transition hover:bg-meadow";

  return (
    <Link className={classes} href={href}>
      {Icon ? <Icon aria-hidden size={18} strokeWidth={2.5} /> : null}
      {children}
    </Link>
  );
}
