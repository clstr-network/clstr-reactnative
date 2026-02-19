/**
 * account - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/account';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/account';
import { withClient } from '@/adapters/bind';

export const deactivateOwnAccount = withClient(_core.deactivateOwnAccount);
export const reactivateOwnAccount = withClient(_core.reactivateOwnAccount);

// Alias to shadow the core re-export (which still expects client)
export const deleteOwnAccount = deactivateOwnAccount;
