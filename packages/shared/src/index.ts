/**
 * @clstr/shared — Cross-platform shared code
 * 
 * This package contains all platform-agnostic code shared between
 * the web app (apps/web) and mobile app (apps/mobile).
 */

// Re-export design system
export * from './design';

// Re-export platform utilities
export { getEnvVariable } from './platform/env';

// Re-export Supabase integration
export { supabase } from './integrations/supabase/client';
export type { Database, Json } from './integrations/supabase/types';

// Re-export UI components
export * from './components/ui';
