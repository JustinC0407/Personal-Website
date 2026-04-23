import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const boldhu = localFont({
  src: "../../fonts/svboldhu.ttf",
  variable: "--font-boldhu",
  display: "swap"
});

const itemFont = localFont({
  src: "../../fonts/stardew-item-font.ttf",
  variable: "--font-item",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "Pixel-World Portfolio",
    template: "%s | Pixel-World Portfolio"
  },
  description: "A recruiter-friendly portfolio with an optional cozy pixel-world exploration mode."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${boldhu.variable} ${itemFont.variable}`}>
      <body suppressHydrationWarning>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
