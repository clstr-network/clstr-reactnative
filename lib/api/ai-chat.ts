/**
 * AI Chat API adapter — Phase 9.9
 * Binds @clstr/core ai-service functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  createChatSession as _createChatSession,
  getChatSessions as _getChatSessions,
  getChatMessages as _getChatMessages,
  saveChatMessage as _saveChatMessage,
  sendAIChatMessage as _sendAIChatMessage,
  deleteChatSession as _deleteChatSession,
  updateChatSessionTitle as _updateChatSessionTitle,
} from '@clstr/core/api/ai-service';

// Re-export types
export type {
  AIChatSession,
  AIChatMessage,
} from '@clstr/core/types/ai';

// Bound API functions
export const createChatSession = withClient(_createChatSession);
export const getChatSessions = withClient(_getChatSessions);
export const getChatMessages = withClient(_getChatMessages);
export const saveChatMessage = withClient(_saveChatMessage);
export const sendAIChatMessage = withClient(_sendAIChatMessage);
export const deleteChatSession = withClient(_deleteChatSession);
export const updateChatSessionTitle = withClient(_updateChatSessionTitle);
