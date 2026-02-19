/**
 * email-transition - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/email-transition';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/email-transition';
import { withClient } from '@/adapters/bind';

// Compat wrappers: inject web appUrl for functions that need it
import { supabase } from '@/adapters/core-client';

const _appUrl = typeof window !== 'undefined' ? window.location.origin : '';

export const getEmailTransitionStatus = withClient(_core.getEmailTransitionStatus);

export const requestPersonalEmailLink = (personalEmail: string) =>
  _core.requestPersonalEmailLink(supabase, personalEmail, _appUrl);

export const resendVerificationCode = (personalEmail: string) =>
  _core.resendVerificationCode(supabase, personalEmail, _appUrl);
export const verifyPersonalEmail = withClient(_core.verifyPersonalEmail);
export const transitionToPersonalEmail = withClient(_core.transitionToPersonalEmail);
export const removePersonalEmail = withClient(_core.removePersonalEmail);
export const dismissPersonalEmailPrompt = withClient(_core.dismissPersonalEmailPrompt);
export const retryAuthEmailChange = withClient(_core.retryAuthEmailChange);
export const mergeTransitionedAccount = withClient(_core.mergeTransitionedAccount);
export const findTransitionedProfileForEmail = withClient(_core.findTransitionedProfileForEmail);
