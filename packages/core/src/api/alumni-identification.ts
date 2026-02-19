/**
 * Alumni Identification — Pure Functions (no Supabase dependency)
 *
 * Determines user role (Student vs Alumni) based on graduation year,
 * plus calendar math helpers for enrollment/course validation.
 */

import type { Database } from '../supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

/**
 * Determines if a user should be classified as Alumni or Student based on
 * their academic timeline.
 *
 * - current year > graduation year → Alumni
 * - current year ≤ graduation year → Student
 *
 * Special roles (Faculty, Principal, Dean, Club, Organization) are preserved.
 */
export function determineUserRoleFromGraduation(
  graduationYear: string | number | null | undefined,
  currentRole?: UserRole | string | null,
): UserRole {
  const preservedRoles: string[] = ['Faculty', 'Principal', 'Dean', 'Club', 'Organization'];
  if (currentRole && preservedRoles.includes(currentRole)) {
    return currentRole as UserRole;
  }

  if (graduationYear === null || graduationYear === undefined || graduationYear === '') {
    return 'Student';
  }

  const gradYear =
    typeof graduationYear === 'string' ? parseInt(graduationYear, 10) : graduationYear;

  if (isNaN(gradYear)) {
    return 'Student';
  }

  const currentYear = new Date().getFullYear();
  return currentYear > gradYear ? 'Alumni' : 'Student';
}

/**
 * Calculates the expected graduation year from enrollment year + course duration.
 */
export function calculateGraduationYear(
  enrollmentYear: string | number | null | undefined,
  courseDurationYears: number = 4,
): number | null {
  if (enrollmentYear === null || enrollmentYear === undefined || enrollmentYear === '') {
    return null;
  }

  const enrollment =
    typeof enrollmentYear === 'string' ? parseInt(enrollmentYear, 10) : enrollmentYear;

  if (isNaN(enrollment)) {
    return null;
  }

  const duration = Math.max(1, Math.min(10, courseDurationYears));
  return enrollment + duration;
}

/**
 * Validates if a graduation year is reasonable (1950 – current + 10).
 */
export function validateGraduationYear(
  graduationYear: string | number | null | undefined,
): { valid: boolean; error?: string } {
  if (graduationYear === null || graduationYear === undefined || graduationYear === '') {
    return { valid: false, error: 'Graduation year is required' };
  }

  const year =
    typeof graduationYear === 'string' ? parseInt(graduationYear, 10) : graduationYear;

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
    return { valid: false, error: 'Graduation year cannot be more than 10 years in the future' };
  }

  return { valid: true };
}

/**
 * Validates course duration is within acceptable range (1–10 years).
 */
export function validateCourseDuration(
  duration: number | null | undefined,
): { valid: boolean; error?: string } {
  if (duration === null || duration === undefined) {
    return { valid: true };
  }

  if (!Number.isInteger(duration) || duration < 1 || duration > 10) {
    return { valid: false, error: 'Course duration must be between 1 and 10 years' };
  }

  return { valid: true };
}

/** Shorthand: is the user Alumni? */
export function isAlumni(graduationYear: string | number | null | undefined): boolean {
  return determineUserRoleFromGraduation(graduationYear) === 'Alumni';
}

/** Shorthand: is the user a Student? */
export function isStudent(graduationYear: string | number | null | undefined): boolean {
  return determineUserRoleFromGraduation(graduationYear) === 'Student';
}

/**
 * Human-readable academic status label.
 */
export function getAcademicStatusLabel(
  graduationYear: string | number | null | undefined,
  role?: string | null,
): string {
  if (role === 'Faculty') return 'Faculty Member';
  if (role === 'Principal') return 'Principal';
  if (role === 'Dean') return 'Dean';
  if (role === 'Club') return 'Club';
  if (role === 'Organization') return 'Organization';

  if (!graduationYear) return 'Student';

  const year =
    typeof graduationYear === 'string' ? parseInt(graduationYear, 10) : graduationYear;

  if (isNaN(year)) return 'Student';

  const currentYear = new Date().getFullYear();
  return currentYear > year ? `Class of ${year}` : `Expected ${year}`;
}
