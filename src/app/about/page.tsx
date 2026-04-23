import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfilePanel } from "@/components/ProfilePanel";
import { aboutContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <main>
      <PageHeader
        description="A profile-panel view of background, interests, and the kind of software work this portfolio is built to show."
        eyebrow="Profile"
        title={aboutContent.name}
      />
      <section className="mx-auto max-w-7xl px-5 py-10">
        <ProfilePanel />
      </section>
    </main>
  );
}
