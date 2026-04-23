import about from "@/data/about.json";
import contact from "@/data/contact.json";
import creative from "@/data/creative.json";
import projects from "@/data/projects.json";
import skillsEducation from "@/data/skillsEducation.json";
import world from "@/data/world.json";

export type ExternalLinks = {
  github?: string;
  demo?: string;
  website?: string;
  caseStudy?: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  whyItMatters: string;
  tech: string[];
  thumbnail: string;
  featured: boolean;
  links: ExternalLinks;
};

export type CreativeWork = {
  id: string;
  slug: string;
  title: string;
  medium: string;
  year: string;
  thumbnail: string;
  images: string[];
  description: string;
};

export type Rect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Hotspot = Rect & {
  label: string;
  description: string;
  contentType?: "about" | "projects" | "creative" | "contact";
  targetRoute?: string;
  secondaryRoute?: string;
  targetScene?: string;
  actionLabel: string;
};

export type WorldScene = {
  id: string;
  name: string;
  background: string;
  spawn: { x: number; y: number };
  collisions: Rect[];
  hotspots: Hotspot[];
};

export type WorldData = {
  sceneSize: { width: number; height: number };
  scenes: WorldScene[];
};

export const aboutContent = about;
export const contactContent = contact;
export const skillsEducationContent = skillsEducation;
export const projectContent = projects as Project[];
export const creativeContent = creative as CreativeWork[];
export const worldContent = world as WorldData;

export function getProjectBySlug(slug: string) {
  return projectContent.find((project) => project.slug === slug);
}

export function getCreativeBySlug(slug: string) {
  return creativeContent.find((work) => work.slug === slug);
}

export function getWorldScene(id: string) {
  return worldContent.scenes.find((scene) => scene.id === id) ?? worldContent.scenes[0];
}
