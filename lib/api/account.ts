/**
 * Account API adapter — Deactivation / reactivation.
 * Binds @clstr/core account functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  deactivateOwnAccount as _deactivateOwnAccount,
  reactivateOwnAccount as _reactivateOwnAccount,
} from '@clstr/core/api/account';

export const deactivateOwnAccount = withClient(_deactivateOwnAccount);
export const reactivateOwnAccount = withClient(_reactivateOwnAccount);
