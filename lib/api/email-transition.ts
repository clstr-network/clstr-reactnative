/**
 * Email Transition API adapter — Phase 4/5
 * Binds @clstr/core email-transition functions to the mobile Supabase client.
 *
 * The `requestPersonalEmailLink` and `resendVerificationCode` functions require
 * an `appUrl` parameter — this is set to the Supabase project URL for mobile
 * since there's no `window.location.origin`.
 */

import { withClient } from '../adapters/bind';
import {
  getEmailTransitionStatus as _getEmailTransitionStatus,
  requestPersonalEmailLink as _requestPersonalEmailLink,
  resendVerificationCode as _resendVerificationCode,
  verifyPersonalEmail as _verifyPersonalEmail,
  transitionToPersonalEmail as _transitionToPersonalEmail,
  removePersonalEmail as _removePersonalEmail,
  dismissPersonalEmailPrompt as _dismissPersonalEmailPrompt,
  retryAuthEmailChange as _retryAuthEmailChange,
  mergeTransitionedAccount as _mergeTransitionedAccount,
  findTransitionedProfileForEmail as _findTransitionedProfileForEmail,
} from '@clstr/core/api/email-transition';

// Re-export types and pure functions
export type {
  EmailTransitionState,
  EmailTransitionStatus,
  EmailTransitionResult,
} from '@clstr/core/api/email-transition';

export {
  shouldPromptPersonalEmail,
  getTransitionDisplayStatus,
  RESEND_COOLDOWN_SECONDS,
  CODE_LENGTH,
} from '@clstr/core/api/email-transition';

// Bound API functions
export const getEmailTransitionStatus = withClient(_getEmailTransitionStatus);
export const verifyPersonalEmail = withClient(_verifyPersonalEmail);
export const transitionToPersonalEmail = withClient(_transitionToPersonalEmail);
export const removePersonalEmail = withClient(_removePersonalEmail);
export const dismissPersonalEmailPrompt = withClient(_dismissPersonalEmailPrompt);
export const retryAuthEmailChange = withClient(_retryAuthEmailChange);
export const mergeTransitionedAccount = withClient(_mergeTransitionedAccount);
export const findTransitionedProfileForEmail = withClient(_findTransitionedProfileForEmail);

/**
 * requestPersonalEmailLink requires an appUrl param.
 * On mobile we use the Supabase project URL as base.
 */
export const requestPersonalEmailLink = withClient(_requestPersonalEmailLink);

/**
 * resendVerificationCode also requires an appUrl param.
 */
export const resendVerificationCode = withClient(_resendVerificationCode);
