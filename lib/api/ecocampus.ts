/**
 * EcoCampus API adapter — Phase 9.6
 * Binds @clstr/core ecocampus-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getMockEcoItemsData,
  getMockEcoRequestsData,
  getMockMyEcoItemsData,
  createMockEcoIntentData,
  deleteMockEcoItemData,
  createMockEcoItemData,
  createMockEcoRequestData,
} from '@/lib/mock-social-data';
import {
  fetchSharedItems as _fetchSharedItems,
  fetchRequests as _fetchRequests,
  fetchMySharedItems as _fetchMySharedItems,
  fetchMyRequests as _fetchMyRequests,
  uploadSharedItemImage as _uploadSharedItemImage,
  createSharedItem as _createSharedItem,
  createItemRequest as _createItemRequest,
  updateSharedItemStatus as _updateSharedItemStatus,
  deleteSharedItem as _deleteSharedItem,
  deleteItemRequest as _deleteItemRequest,
  updateSharedItemDetails as _updateSharedItemDetails,
  updateItemRequest as _updateItemRequest,
  fetchSharedItemIntents as _fetchSharedItemIntents,
  createSharedItemIntent as _createSharedItemIntent,
  deleteSharedItemIntent as _deleteSharedItemIntent,
  fetchItemRequestResponses as _fetchItemRequestResponses,
  createItemRequestResponse as _createItemRequestResponse,
  deleteItemRequestResponse as _deleteItemRequestResponse,
  sendEcoCampusMessage as _sendEcoCampusMessage,
} from '@clstr/core/api/ecocampus-api';

// Re-export types
export type {
  SharedItem,
  ItemRequest,
  SharedItemIntent,
  ItemRequestResponse,
} from '@clstr/core/api/ecocampus-api';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

// Bound API functions
export async function fetchSharedItems() {
  if (AUTH_MODE === 'mock') {
    return getMockEcoItemsData();
  }
  return withClient(_fetchSharedItems)();
}

export async function fetchRequests() {
  if (AUTH_MODE === 'mock') {
    return getMockEcoRequestsData();
  }
  return withClient(_fetchRequests)();
}

export async function fetchMySharedItems() {
  if (AUTH_MODE === 'mock') {
    return getMockMyEcoItemsData('mock-user-001');
  }
  return withClient(_fetchMySharedItems)();
}
export const fetchMyRequests = withClient(_fetchMyRequests);
export const uploadSharedItemImage = withClient(_uploadSharedItemImage);
export async function createSharedItem(payload: {
  title: string;
  description?: string;
  category?: string;
  share_type?: 'donate' | 'sell' | 'rent';
}) {
  if (AUTH_MODE === 'mock') {
    return createMockEcoItemData(payload);
  }
  return withClient(_createSharedItem)(payload as any);
}

export async function createItemRequest(payload: {
  item: string;
  description?: string;
  urgency?: string;
  preference?: string;
}) {
  if (AUTH_MODE === 'mock') {
    return createMockEcoRequestData(payload);
  }
  return withClient(_createItemRequest)(payload as any);
}
export const updateSharedItemStatus = withClient(_updateSharedItemStatus);
export async function deleteSharedItem(itemId: string) {
  if (AUTH_MODE === 'mock') {
    return deleteMockEcoItemData(itemId);
  }
  return withClient(_deleteSharedItem)(itemId as any);
}
export const deleteItemRequest = withClient(_deleteItemRequest);
export const updateSharedItemDetails = withClient(_updateSharedItemDetails);
export const updateItemRequest = withClient(_updateItemRequest);
export const fetchSharedItemIntents = withClient(_fetchSharedItemIntents);
export async function createSharedItemIntent(itemId: string, ownerId: string, intentType: string) {
  if (AUTH_MODE === 'mock') {
    return createMockEcoIntentData();
  }
  return withClient(_createSharedItemIntent)(itemId as any, ownerId as any, intentType as any);
}
export const deleteSharedItemIntent = withClient(_deleteSharedItemIntent);
export const fetchItemRequestResponses = withClient(_fetchItemRequestResponses);
export const createItemRequestResponse = withClient(_createItemRequestResponse);
export const deleteItemRequestResponse = withClient(_deleteItemRequestResponse);
export const sendEcoCampusMessage = withClient(_sendEcoCampusMessage);
