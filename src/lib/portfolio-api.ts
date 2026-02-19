/**
 * portfolio-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/portfolio-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/portfolio-api';
import { withClient } from '@/adapters/bind';

export const getPortfolioSettings = withClient(_core.getPortfolioSettings);
export const resolvePortfolioSlug = withClient(_core.resolvePortfolioSlug);
export const updatePortfolioSettings = withClient(_core.updatePortfolioSettings);
export const activatePortfolio = withClient(_core.activatePortfolio);
