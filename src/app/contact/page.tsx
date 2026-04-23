import type { Metadata } from "next";
import { Download, Github, Linkedin, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { contactContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact"
};

export default function ContactPage() {
  const links = [
    { label: "Email", href: `mailto:${contactContent.email}`, value: contactContent.email, icon: Mail },
    { label: "LinkedIn", href: contactContent.linkedin, value: "Open profile", icon: Linkedin },
    { label: "GitHub", href: contactContent.github, value: "Open repositories", icon: Github },
    { label: "Resume", href: contactContent.resume, value: "View or download", icon: Download }
  ];

  return (
    <main>
      <PageHeader
        description="Fast access to recruiter-relevant contact links and resume information."
        eyebrow="Mailbox"
        title="Contact / Resume"
      />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="pixel-panel p-6 md:p-8">
          <p className="max-w-3xl text-lg leading-8 text-ink/80">{contactContent.availability}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a className="border-4 border-ink bg-white p-5 transition hover:bg-wheat" href={link.href} key={link.label}>
                  <Icon aria-hidden size={24} strokeWidth={2.5} />
                  <h2 className="mt-4 font-display text-2xl font-black">{link.label}</h2>
                  <p className="mt-2 break-words text-sm font-semibold text-ink/70">{link.value}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
