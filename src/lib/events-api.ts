/**
 * events-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/events-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/events-api';
import { withClient } from '@/adapters/bind';

export const getEventByIdPublic = withClient(_core.getEventByIdPublic);
export const getEventById = withClient(_core.getEventById);
export const registerForEvent = withClient(_core.registerForEvent);
export const unregisterFromEvent = withClient(_core.unregisterFromEvent);
export const trackExternalRegistrationClick = withClient(_core.trackExternalRegistrationClick);
export const recordEventLinkCopy = withClient(_core.recordEventLinkCopy);
export const getConnectionsForSharing = withClient(_core.getConnectionsForSharing);
export const deleteEvent = withClient(_core.deleteEvent);
export const updateEvent = withClient(_core.updateEvent);

// Compat wrappers: shareEvent/shareEventToMultiple inject web deps
import { supabase } from '@/adapters/core-client';
import { sendMessage } from '@clstr/core/api/messages-api';

const webShareDeps: _core.ShareEventDeps = {
  sendMessage,
  appUrl: typeof window !== 'undefined' ? window.location.origin : '',
};

export const shareEvent = (params: { event_id: string; receiver_id: string; message?: string }) =>
  _core.shareEvent(supabase, webShareDeps, params);
export const shareEventToMultiple = (params: { event_id: string; receiver_ids: string[]; message?: string }) =>
  _core.shareEventToMultiple(supabase, webShareDeps, params);
