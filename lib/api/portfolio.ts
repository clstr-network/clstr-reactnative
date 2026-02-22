/**
 * Portfolio API adapter — Phase 9.7
 * Binds @clstr/core portfolio-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getPortfolioSettings as _getPortfolioSettings,
  updatePortfolioSettings as _updatePortfolioSettings,
  activatePortfolio as _activatePortfolio,
  resolvePortfolioSlug as _resolvePortfolioSlug,
} from '@clstr/core/api/portfolio-api';

// Re-export types
export type { PortfolioSettings } from '@clstr/core/types/portfolio';

// Bound API functions
export const getPortfolioSettings = withClient(_getPortfolioSettings);
export const updatePortfolioSettings = withClient(_updatePortfolioSettings);
export const activatePortfolio = withClient(_activatePortfolio);
export const resolvePortfolioSlug = withClient(_resolvePortfolioSlug);
