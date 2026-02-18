/**
 * Schema.org JSON-LD helpers for SEO structured data
 * Maps Clstr entities to Schema.org vocabulary for enhanced search visibility
 */

export interface PersonSchema {
  "@context": "https://schema.org";
  "@type": "Person";
  name: string;
  jobTitle?: string;
  worksFor?: OrganizationSchema;
  alumniOf?: CollegeSchema;
  knowsAbout?: string | string[];
  hasCredential?: EducationalCredentialSchema;
  image?: string;
  email?: string;
  url?: string;
}

export interface CollegeSchema {
  "@context"?: "https://schema.org";
  "@type": "CollegeOrUniversity";
  name: string;
  url?: string;
  logo?: string;
  sameAs?: string;
  address?: string;
}

export interface OrganizationSchema {
  "@context"?: "https://schema.org";
  "@type": "Organization";
  name: string;
  description?: string;
  url?: string;
  logo?: string;
  member?: PersonSchema[];
  parentOrganization?: CollegeSchema;
  email?: string;
  numberOfEmployees?: number;
}

export interface EducationalCredentialSchema {
  "@type": "EducationalOccupationalCredential";
  name: string;
  credentialCategory?: string;
}

export interface EventSchema {
  "@context": "https://schema.org";
  "@type": "Event";
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: {
    "@type": "Place";
    name?: string;
    address?: string;
  } | {
    "@type": "VirtualLocation";
    url: string;
  };
  organizer?: OrganizationSchema | PersonSchema;
  eventStatus: string;
  eventAttendanceMode?: string;
  image?: string;
  url?: string;
}

export interface ProjectSchema {
  "@context": "https://schema.org";
  "@type": "CreativeWork";
  name: string;
  headline?: string;
  description?: string;
  author: PersonSchema | PersonSchema[];
  contributor?: PersonSchema[];
  dateCreated?: string;
  dateModified?: string;
  keywords?: string | string[];
  image?: string;
  url?: string;
}

export interface ProductSchema {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description?: string;
  image?: string | string[];
  offers: {
    "@type": "Offer";
    price: string | number;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
  category?: string;
}

export interface EducationalProgramSchema {
  "@context": "https://schema.org";
  "@type": "EducationalOccupationalProgram";
  name: string;
  description?: string;
  programType?: string;
  educationalLevel?: string;
  provider: OrganizationSchema | PersonSchema;
  offers?: {
    "@type": "Offer";
    category?: string;
  };
  timeToComplete?: string;
}

/**
 * Generates a Person schema for student or alumni profiles
 */
export const createPersonSchema = (profile: {
  name: string;
  jobTitle?: string;
  university?: string;
  skills?: string[];
  avatarUrl?: string;
  email?: string;
  credential?: string;
}): PersonSchema => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  ...(profile.jobTitle && { jobTitle: profile.jobTitle }),
  ...(profile.university && {
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: profile.university,
    },
  }),
  ...(profile.skills && profile.skills.length > 0 && { knowsAbout: profile.skills }),
  ...(profile.avatarUrl && { image: profile.avatarUrl }),
  ...(profile.email && { email: profile.email }),
  ...(profile.credential && {
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: profile.credential,
    },
  }),
});

/**
 * Generates an Event schema for campus events
 */
export const createEventSchema = (event: {
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  isVirtual?: boolean;
  virtualLink?: string;
  organizerName?: string;
  coverImageUrl?: string;
}): EventSchema => {
  const startDate = event.eventTime
    ? `${event.eventDate}T${event.eventTime}`
    : event.eventDate;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(event.description && { description: event.description }),
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    ...(event.isVirtual
      ? {
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          location: {
            "@type": "VirtualLocation",
            url: event.virtualLink || "",
          },
        }
      : {
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: event.location || "",
          },
        }),
    ...(event.organizerName && {
      organizer: {
        "@type": "Organization",
        name: event.organizerName,
      },
    }),
    ...(event.coverImageUrl && { image: event.coverImageUrl }),
  };
};

/**
 * Generates a Project schema for student collaborations
 */
export const createProjectSchema = (project: {
  title: string;
  description?: string;
  authorName: string;
  contributors?: string[];
  createdAt?: string;
  tags?: string[];
  coverImageUrl?: string;
}): ProjectSchema => ({
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: project.title,
  ...(project.description && { headline: project.description }),
  author: {
    "@context": "https://schema.org",
    "@type": "Person",
    name: project.authorName,
  },
  ...(project.contributors &&
    project.contributors.length > 0 && {
      contributor: project.contributors.map((name) => ({
        "@context": "https://schema.org",
        "@type": "Person",
        name,
      })),
    }),
  ...(project.createdAt && { dateCreated: project.createdAt }),
  ...(project.tags && project.tags.length > 0 && { keywords: project.tags }),
  ...(project.coverImageUrl && { image: project.coverImageUrl }),
});

/**
 * Generates an Organization schema for clubs
 */
export const createClubSchema = (club: {
  name: string;
  description?: string;
  memberCount?: number;
  university?: string;
  email?: string;
  logoUrl?: string;
}): OrganizationSchema => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: club.name,
  ...(club.description && { description: club.description }),
  ...(club.memberCount && { numberOfEmployees: club.memberCount }),
  ...(club.university && {
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: club.university,
    },
  }),
  ...(club.email && { email: club.email }),
  ...(club.logoUrl && { logo: club.logoUrl }),
});

/**
 * Generates a Product schema for EcoCampus items
 */
export const createProductSchema = (item: {
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}): ProductSchema => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: item.title,
  ...(item.description && { description: item.description }),
  ...(item.imageUrl && { image: item.imageUrl }),
  offers: {
    "@type": "Offer",
    price: 0,
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  },
  ...(item.category && { category: item.category }),
});

/**
 * Generates an EducationalOccupationalProgram schema for mentorship
 */
export const createMentorshipSchema = (mentorship: {
  title: string;
  description?: string;
  mentorName: string;
  mentorTitle?: string;
  educationalLevel?: string;
}): EducationalProgramSchema => ({
  "@context": "https://schema.org",
  "@type": "EducationalOccupationalProgram",
  name: mentorship.title || "Alumni Mentorship Program",
  ...(mentorship.description && { description: mentorship.description }),
  programType: "Mentorship",
  ...(mentorship.educationalLevel && { educationalLevel: mentorship.educationalLevel }),
  provider: {
    "@context": "https://schema.org",
    "@type": "Person",
    name: mentorship.mentorName,
    ...(mentorship.mentorTitle && { jobTitle: mentorship.mentorTitle }),
  },
});
