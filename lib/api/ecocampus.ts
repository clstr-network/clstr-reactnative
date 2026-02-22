/**
 * EcoCampus API adapter — Phase 9.6
 * Binds @clstr/core ecocampus-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
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

// Bound API functions
export const fetchSharedItems = withClient(_fetchSharedItems);
export const fetchRequests = withClient(_fetchRequests);
export const fetchMySharedItems = withClient(_fetchMySharedItems);
export const fetchMyRequests = withClient(_fetchMyRequests);
export const uploadSharedItemImage = withClient(_uploadSharedItemImage);
export const createSharedItem = withClient(_createSharedItem);
export const createItemRequest = withClient(_createItemRequest);
export const updateSharedItemStatus = withClient(_updateSharedItemStatus);
export const deleteSharedItem = withClient(_deleteSharedItem);
export const deleteItemRequest = withClient(_deleteItemRequest);
export const updateSharedItemDetails = withClient(_updateSharedItemDetails);
export const updateItemRequest = withClient(_updateItemRequest);
export const fetchSharedItemIntents = withClient(_fetchSharedItemIntents);
export const createSharedItemIntent = withClient(_createSharedItemIntent);
export const deleteSharedItemIntent = withClient(_deleteSharedItemIntent);
export const fetchItemRequestResponses = withClient(_fetchItemRequestResponses);
export const createItemRequestResponse = withClient(_createItemRequestResponse);
export const deleteItemRequestResponse = withClient(_deleteItemRequestResponse);
export const sendEcoCampusMessage = withClient(_sendEcoCampusMessage);
