import universityDomains from '../../../../external/university-domains-india.json';

export interface UniversityData {
  name: string;
  domains: string[];
  web_pages?: string[];
  country?: string;
  alpha_two_code?: string;
  "state-province"?: string | null;
}

/**
 * Get all unique university names from the domains list
 */
export function getAllUniversityNames(): string[] {
  return universityDomains
    .map((uni: UniversityData) => uni.name)
    .filter((name, index, self) => name && self.indexOf(name) === index)
    .sort();
}

/**
 * Find a university by its email domain
 * @param domain The email domain (e.g., "raghuenggcollege.in")
 * @returns The university data if found, null otherwise
 */
export function findUniversityByDomain(domain: string): UniversityData | null {
  if (!domain) return null;
  
  const normalizedDomain = domain.toLowerCase().trim();
  
  return universityDomains.find((uni: UniversityData) => 
    uni.domains?.some(d => d.toLowerCase() === normalizedDomain)
  ) || null;
}

/**
 * Get university name from email domain
 * @param domain The email domain
 * @returns The university name if found, null otherwise
 */
export function getUniversityNameFromDomain(domain: string): string | null {
  const university = findUniversityByDomain(domain);
  return university?.name || null;
}

/**
 * Search universities by name (for autocomplete)
 * @param query Search query (minimum 2 characters)
 * @returns Matching universities (max 10 results)
 */
export function searchUniversities(query: string): UniversityData[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return universityDomains
    .filter((uni: UniversityData) => 
      uni.name?.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 10);
}

/**
 * Common fields of study / majors for Indian universities
 */
export const COMMON_MAJORS = [
  // Engineering & Technology
  "Computer Science and Engineering",
  "Computer Science",
  "Information Technology",
  "Electronics and Communication Engineering",
  "Electrical Engineering",
  "Electrical and Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
  "Biotechnology",
  "Biomedical Engineering",
  "Automobile Engineering",
  "Artificial Intelligence and Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Software Engineering",
  "Robotics Engineering",
  "Environmental Engineering",
  "Industrial Engineering",
  "Instrumentation Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Agricultural Engineering",
  "Food Technology",
  "Textile Engineering",
  "Marine Engineering",
  "Mechatronics",
  
  // Sciences
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "Biochemistry",
  "Microbiology",
  "Botany",
  "Zoology",
  "Environmental Science",
  "Statistics",
  "Applied Mathematics",
  
  // Commerce & Business
  "Commerce",
  "Business Administration",
  "Management Studies",
  "Finance",
  "Marketing",
  "Human Resource Management",
  "Accounting",
  "Economics",
  "Banking and Insurance",
  "International Business",
  "Entrepreneurship",
  
  // Arts & Humanities
  "English Literature",
  "History",
  "Political Science",
  "Psychology",
  "Sociology",
  "Philosophy",
  "Geography",
  "Journalism and Mass Communication",
  "Public Administration",
  "Social Work",
  "Fine Arts",
  "Performing Arts",
  "Music",
  "Design",
  "Animation and Multimedia",
  
  // Medical & Health Sciences
  "Medicine (MBBS)",
  "Dental Surgery (BDS)",
  "Pharmacy",
  "Nursing",
  "Physiotherapy",
  "Ayurveda",
  "Homeopathy",
  "Veterinary Science",
  "Public Health",
  
  // Law
  "Law",
  "Corporate Law",
  "Criminal Law",
  "International Law",
  
  // Architecture & Planning
  "Architecture",
  "Urban Planning",
  "Interior Design",
  "Landscape Architecture",
  
  // Agriculture
  "Agriculture",
  "Horticulture",
  "Forestry",
  "Fisheries Science",
  "Dairy Technology",
  
  // Education
  "Education",
  "Physical Education",
  "Special Education",
  
  // Hotel Management & Hospitality
  "Hotel Management",
  "Tourism Management",
  "Culinary Arts",
  "Event Management",
  
  // Other Professional Courses
  "Aviation",
  "Fashion Design",
  "Film Studies",
  "Sports Management",
  "Library Science",
];

/**
 * Get majors/fields of study matching a search query
 * @param query Search query (minimum 2 characters)
 * @returns Matching majors (max 10 results)
 */
export function searchMajors(query: string): string[] {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return COMMON_MAJORS
    .filter(major => major.toLowerCase().includes(normalizedQuery))
    .slice(0, 10);
}

/**
 * Get all majors as autocomplete options
 */
export function getMajorOptions(): { value: string; label: string }[] {
  return COMMON_MAJORS.map(major => ({
    value: major.toLowerCase().replace(/\s+/g, '-'),
    label: major,
  }));
}

/**
 * Get all universities as autocomplete options
 */
export function getUniversityOptions(): { value: string; label: string }[] {
  return universityDomains
    .map((uni: UniversityData) => ({
      value: uni.domains?.[0] || uni.name.toLowerCase().replace(/\s+/g, '-'),
      label: uni.name,
    }))
    .filter((opt, index, self) => 
      opt.label && self.findIndex(o => o.label === opt.label) === index
    )
    .sort((a, b) => a.label.localeCompare(b.label));
}
