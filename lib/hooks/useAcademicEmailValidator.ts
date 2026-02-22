/**
 * useAcademicEmailValidator — Validates if an email belongs to a recognized
 * academic institution.
 *
 * Mirrors the web's `src/hooks/useAcademicEmailValidator.ts`.
 * Uses pure shared validation utilities + optional custom domain allowlist
 * via EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS env variable.
 */
import { useCallback, useMemo } from 'react';
import {
  getDomainFromEmail,
  isValidAcademicEmail,
} from '@/lib/adapters/validation';

export type AcademicEmailValidationResult = {
  valid: boolean;
  domain?: string;
  message?: string;
};

/**
 * Parse a comma-separated list of allowed domains from the environment.
 * Returns an empty array if the variable is not set.
 */
const parseCustomDomains = (): string[] => {
  const raw = process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
};

export const useAcademicEmailValidator = () => {
  const customDomains = useMemo(() => parseCustomDomains(), []);

  const validate = useCallback(
    (email: string): AcademicEmailValidationResult => {
      if (!email) {
        return { valid: false, message: 'Email is required' };
      }

      const domain = getDomainFromEmail(email);
      if (!domain) {
        return { valid: false, message: 'Enter a valid email address' };
      }

      const isCustomAllowed = customDomains.includes(domain);
      const isAcademic = isValidAcademicEmail(email);

      if (!isAcademic && !isCustomAllowed) {
        return {
          valid: false,
          domain,
          message: `The domain '${domain}' is not recognized as an academic email.`,
        };
      }

      if (email.includes(' ')) {
        return {
          valid: false,
          domain,
          message: 'Email addresses cannot contain spaces.',
        };
      }

      return { valid: true, domain };
    },
    [customDomains]
  );

  return { validate };
};
