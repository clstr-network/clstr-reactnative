/**
 * ai-service - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/ai-service';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/ai-service';
import { withClient } from '@/adapters/bind';

export const createChatSession = withClient(_core.createChatSession);
export const getChatSessions = withClient(_core.getChatSessions);
export const getChatMessages = withClient(_core.getChatMessages);
export const saveChatMessage = withClient(_core.saveChatMessage);
export const sendAIChatMessage = withClient(_core.sendAIChatMessage);
export const deleteChatSession = withClient(_core.deleteChatSession);
export const updateChatSessionTitle = withClient(_core.updateChatSessionTitle);
export const saveAIReviewResult = withClient(_core.saveAIReviewResult);
