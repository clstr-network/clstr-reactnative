/**
 * Messages API adapter — Conversations, messages, realtime.
 * Binds @clstr/core messages-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  assertCanMessagePartner as _assertCanMessagePartner,
  getUnreadMessageCount as _getUnreadMessageCount,
  getConversations as _getConversations,
  getMessages as _getMessages,
  sendMessage as _sendMessage,
  markMessagesAsRead as _markMessagesAsRead,
  updateLastSeen as _updateLastSeen,
  subscribeToMessages as _subscribeToMessages,
  getConnectedUsers as _getConnectedUsers,
  isUserOnline,
  PRIVILEGED_MESSAGING_ROLES,
} from '@clstr/core/api/messages-api';

// Re-export types + constants
export type {
  MessagingConnectionStatus,
  MessageUser,
  Message,
  Conversation,
} from '@clstr/core/api/messages-api';

export { isUserOnline, PRIVILEGED_MESSAGING_ROLES };

// Bound API functions
export const assertCanMessagePartner = withClient(_assertCanMessagePartner);
export const getUnreadMessageCount = withClient(_getUnreadMessageCount);
export const getConversations = withClient(_getConversations);
export const getMessages = withClient(_getMessages);
export const sendMessage = withClient(_sendMessage);
export const markMessagesAsRead = withClient(_markMessagesAsRead);
export const updateLastSeen = withClient(_updateLastSeen);
export const subscribeToMessages = withClient(_subscribeToMessages);
export const getConnectedUsers = withClient(_getConnectedUsers);
