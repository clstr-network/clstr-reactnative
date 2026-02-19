/**
 * ecocampus-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/ecocampus-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/ecocampus-api';
import { withClient } from '@/adapters/bind';

export const uploadSharedItemImage = withClient(_core.uploadSharedItemImage);
export const fetchSharedItems = withClient(_core.fetchSharedItems);
export const fetchRequests = withClient(_core.fetchRequests);
export const fetchMySharedItems = withClient(_core.fetchMySharedItems);
export const fetchMyRequests = withClient(_core.fetchMyRequests);
export const createSharedItem = withClient(_core.createSharedItem);
export const createItemRequest = withClient(_core.createItemRequest);
export const updateSharedItemStatus = withClient(_core.updateSharedItemStatus);
export const deleteSharedItem = withClient(_core.deleteSharedItem);
export const deleteItemRequest = withClient(_core.deleteItemRequest);
export const updateSharedItemDetails = withClient(_core.updateSharedItemDetails);
export const updateItemRequest = withClient(_core.updateItemRequest);
export const fetchSharedItemIntents = withClient(_core.fetchSharedItemIntents);
export const createSharedItemIntent = withClient(_core.createSharedItemIntent);
export const deleteSharedItemIntent = withClient(_core.deleteSharedItemIntent);
export const fetchItemRequestResponses = withClient(_core.fetchItemRequestResponses);
export const createItemRequestResponse = withClient(_core.createItemRequestResponse);
export const deleteItemRequestResponse = withClient(_core.deleteItemRequestResponse);
export const sendEcoCampusMessage = withClient(_core.sendEcoCampusMessage);
