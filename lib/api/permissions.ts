/**
 * Feature Permissions adapter.
 * These functions are pure (no Supabase client needed) — just re-export.
 */

export {
  normalizeProfileType,
  getFeaturePermissions,
  canAccessFeature,
  canAccessRoute,
  getHiddenNavItems,
  canPerformProjectAction,
  canPerformClubAction,
  canPerformEventAction,
  canPerformEcoCampusAction,
  canPerformJobAction,
  canPerformMentorshipAction,
} from '@clstr/core/api/feature-permissions';

export type {
  ProfileType,
  FeaturePermissions,
} from '@clstr/core/api/feature-permissions';
