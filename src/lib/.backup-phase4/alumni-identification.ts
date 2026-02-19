import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Determines if a user should be classified as Alumni or Student based on their academic timeline.
 * 
 * Logic:
 * - If current year > graduation year → Alumni
 * - If current year <= graduation year → Student
 * 
 * Special roles (Faculty, Principal, Dean, Club, Organization) are preserved and not changed.
 * 
 * @param graduationYear - The expected or actual graduation year (string or number)
 * @param currentRole - The current role of the user (optional)
 * @returns The determined user role
 */
export function determineUserRoleFromGraduation(
  graduationYear: string | number | null | undefined,
  currentRole?: UserRole | string | null
): UserRole {
  // Staff/Special roles should never be auto-changed
  const preservedRoles: string[] = ['Faculty', 'Principal', 'Dean', 'Club', 'Organization'];
  if (currentRole && preservedRoles.includes(currentRole)) {
    return currentRole as UserRole;
  }

  // If no graduation year provided, default to Student
  if (graduationYear === null || graduationYear === undefined || graduationYear === '') {
    return 'Student';
  }

  // Parse graduation year
  const gradYear = typeof graduationYear === 'string' 
    ? parseInt(graduationYear, 10) 
    : graduationYear;

  // If parsing failed, default to Student
  if (isNaN(gradYear)) {
    return 'Student';
  }

  // Get current year
  const currentYear = new Date().getFullYear();

  // Determine role based on comparison
  // If current year is greater than graduation year, user is Alumni
  // Otherwise, user is Student
  if (currentYear > gradYear) {
    return 'Alumni';
  }
  
  return 'Student';
}

/**
 * Calculates the expected graduation year based on enrollment year and course duration.
 * 
 * @param enrollmentYear - The year the user started their course
 * @param courseDurationYears - Duration of the course in years (default: 4)
 * @returns The calculated graduation year
 */
export function calculateGraduationYear(
  enrollmentYear: string | number | null | undefined,
  courseDurationYears: number = 4
): number | null {
  if (enrollmentYear === null || enrollmentYear === undefined || enrollmentYear === '') {
    return null;
  }

  const enrollment = typeof enrollmentYear === 'string'
    ? parseInt(enrollmentYear, 10)
    : enrollmentYear;

  if (isNaN(enrollment)) {
    return null;
  }

  // Validate course duration
  const duration = Math.max(1, Math.min(10, courseDurationYears));

  return enrollment + duration;
}

/**
 * Validates if a graduation year is reasonable (between 1950 and 10 years in the future).
 * 
 * @param graduationYear - The graduation year to validate
 * @returns Object with valid flag and optional error message
 */
export function validateGraduationYear(
  graduationYear: string | number | null | undefined
): { valid: boolean; error?: string } {
  if (graduationYear === null || graduationYear === undefined || graduationYear === '') {
    return { valid: false, error: 'Graduation year is required' };
  }

  const year = typeof graduationYear === 'string'
    ? parseInt(graduationYear, 10)
    : graduationYear;

  if (isNaN(year)) {
    return { valid: false, error: 'Graduation year must be a valid number' };
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1950;
  const maxYear = currentYear + 10;

  if (year < minYear) {
    return { valid: false, error: `Graduation year cannot be before ${minYear}` };
  }

  if (year > maxYear) {
    return { valid: false, error: `Graduation year cannot be more than 10 years in the future` };
  }

  return { valid: true };
}

/**
 * Validates course duration is within acceptable range (1-10 years).
 * 
 * @param duration - The course duration in years
 * @returns Object with valid flag and optional error message
 */
export function validateCourseDuration(
  duration: number | null | undefined
): { valid: boolean; error?: string } {
  if (duration === null || duration === undefined) {
    return { valid: true }; // Optional field, default will be used
  }

  if (!Number.isInteger(duration) || duration < 1 || duration > 10) {
    return { valid: false, error: 'Course duration must be between 1 and 10 years' };
  }

  return { valid: true };
}

/**
 * Checks if a user is classified as Alumni based on their graduation year.
 * 
 * @param graduationYear - The graduation year
 * @returns true if user should be Alumni, false otherwise
 */
export function isAlumni(graduationYear: string | number | null | undefined): boolean {
  return determineUserRoleFromGraduation(graduationYear) === 'Alumni';
}

/**
 * Checks if a user is classified as Student based on their graduation year.
 * 
 * @param graduationYear - The graduation year
 * @returns true if user should be Student, false otherwise
 */
export function isStudent(graduationYear: string | number | null | undefined): boolean {
  return determineUserRoleFromGraduation(graduationYear) === 'Student';
}

/**
 * Gets a human-readable label for the user's academic status.
 * 
 * @param graduationYear - The graduation year
 * @param role - Current role
 * @returns Status label (e.g., "Class of 2024", "Expected 2026", "Faculty")
 */
export function getAcademicStatusLabel(
  graduationYear: string | number | null | undefined,
  role?: string | null
): string {
  // Handle special roles
  if (role === 'Faculty') return 'Faculty Member';
  if (role === 'Principal') return 'Principal';
  if (role === 'Dean') return 'Dean';
  if (role === 'Club') return 'Club';
  if (role === 'Organization') return 'Organization';

  if (!graduationYear) return 'Student';

  const year = typeof graduationYear === 'string'
    ? parseInt(graduationYear, 10)
    : graduationYear;

  if (isNaN(year)) return 'Student';

  const currentYear = new Date().getFullYear();

  if (currentYear > year) {
    return `Class of ${year}`;
  }
  
  return `Expected ${year}`;
}
