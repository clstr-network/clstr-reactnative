// Portfolio types — matches the showcase repo's ProfileData shape
// Used by templates to render public portfolio pages

export interface PortfolioEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
}

export interface PortfolioExperience {
  id: string;
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  link: string;
  tags: string[];
}

export interface PortfolioPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type TemplateId = "minimal" | "eliana" | "typefolio" | "geeky";

export interface PortfolioSettings {
  isLive: boolean;
  showAbout: boolean;
  showEducation: boolean;
  showExperience: boolean;
  showSkills: boolean;
  showProjects: boolean;
  showPosts: boolean;
  slug: string;
  template: TemplateId;
}

export interface ProfileData {
  name: string;
  photo: string;
  role: string;
  about: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  website: string;
  education: PortfolioEducation[];
  experience: PortfolioExperience[];
  skills: string[];
  projects: PortfolioProject[];
  posts: PortfolioPost[];
  settings: PortfolioSettings;
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
}

export const PORTFOLIO_TEMPLATES: TemplateInfo[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean, dark theme with a focus on content. The default Clstr look.",
  },
  {
    id: "eliana",
    name: "Eliana",
    description: "Warm, personal portfolio with gradient accents and a friendly hero section.",
  },
  {
    id: "typefolio",
    name: "Typefolio",
    description: "Bold typography, scenic banner and a professional card-based layout.",
  },
  {
    id: "geeky",
    name: "Geeky",
    description: "Developer-focused blog style with a playful, tech-forward aesthetic.",
  },
];

/** Default settings for a brand-new portfolio */
export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  isLive: false,
  showAbout: true,
  showEducation: true,
  showExperience: true,
  showSkills: true,
  showProjects: true,
  showPosts: true,
  slug: "",
  template: "minimal",
};
