/**
 * Events API adapter — Event CRUD, registration, sharing.
 * Binds @clstr/core events-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getEventByIdPublic as _getEventByIdPublic,
  getEventById as _getEventById,
  registerForEvent as _registerForEvent,
  unregisterFromEvent as _unregisterFromEvent,
  trackExternalRegistrationClick as _trackExternalRegistrationClick,
  shareEvent as _shareEvent,
  shareEventToMultiple as _shareEventToMultiple,
  recordEventLinkCopy as _recordEventLinkCopy,
  getConnectionsForSharing as _getConnectionsForSharing,
  deleteEvent as _deleteEvent,
  updateEvent as _updateEvent,
  parseEventTime,
  extractEventType,
  normalizeCreator,
} from '@clstr/core/api/events-api';

// Re-export types + pure helpers
export type {
  EventCreator,
  Event,
  EventShare,
  UpdateEventInput,
  ConnectionUser,
  ShareEventDeps,
} from '@clstr/core/api/events-api';

export { parseEventTime, extractEventType, normalizeCreator };

// Bound API functions
export const getEventByIdPublic = withClient(_getEventByIdPublic);
export const getEventById = withClient(_getEventById);
export const registerForEvent = withClient(_registerForEvent);
export const unregisterFromEvent = withClient(_unregisterFromEvent);
export const trackExternalRegistrationClick = withClient(_trackExternalRegistrationClick);
export const shareEvent = withClient(_shareEvent);
export const shareEventToMultiple = withClient(_shareEventToMultiple);
export const recordEventLinkCopy = withClient(_recordEventLinkCopy);
export const getConnectionsForSharing = withClient(_getConnectionsForSharing);
export const deleteEvent = withClient(_deleteEvent);
export const updateEvent = withClient(_updateEvent);
