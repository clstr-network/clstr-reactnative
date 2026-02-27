/**
 * Social API adapter — Feed, posts, reactions, comments.
 * Binds @clstr/core social-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getMockConnectionsData,
  getMockPostsByUserData,
  getMockUserPostsCountData,
  toggleMockSavePostData,
  voteMockPollData,
  checkMockConnectionStatusData,
  sendMockConnectionRequestData,
  removeMockConnectionData,
  countMockMutualConnectionsData,
} from '@/lib/mock-social-data';
import {
  createPost as _createPost,
  getPosts as _getPosts,
  getPostById as _getPostById,
  getPostByIdPublic as _getPostByIdPublic,
  getPostsByUser as _getPostsByUser,
  getUserPostsCount as _getUserPostsCount,
  toggleReaction as _toggleReaction,
  togglePostLike as _togglePostLike,
  getComments as _getComments,
  createComment as _createComment,
  toggleCommentLike as _toggleCommentLike,
  editComment as _editComment,
  deleteComment as _deleteComment,
  deletePost as _deletePost,
  updatePost as _updatePost,
  reportPost as _reportPost,
  hidePost as _hidePost,
  unhidePost as _unhidePost,
  sharePost as _sharePost,
  sharePostToMultiple as _sharePostToMultiple,
  saveItem as _saveItem,
  unsaveItem as _unsaveItem,
  checkIfSaved as _checkIfSaved,
  getSavedPosts as _getSavedPosts,
  toggleSavePost as _toggleSavePost,
  voteOnPoll as _voteOnPoll,
  hasUserVotedOnPoll as _hasUserVotedOnPoll,
  createRepost as _createRepost,
  deleteRepost as _deleteRepost,
  hasUserReposted as _hasUserReposted,
  getPostReposts as _getPostReposts,
  getFeedWithReposts as _getFeedWithReposts,
  getTopCommentsBatch as _getTopCommentsBatch,
  getTopComments as _getTopComments,
  countMutualConnections as _countMutualConnections,
  countMutualConnectionsBatch as _countMutualConnectionsBatch,
  // Connection management
  getConnections as _getConnections,
  getConnectionRequests as _getConnectionRequests,
  sendConnectionRequest as _sendConnectionRequest,
  acceptConnectionRequest as _acceptConnectionRequest,
  rejectConnectionRequest as _rejectConnectionRequest,
  removeConnection as _removeConnection,
  checkConnectionStatus as _checkConnectionStatus,
} from '@clstr/core/api/social-api';

// Re-export types for convenience
export type {
  Post,
  Comment,
  ReactionType,
  ReactionCount,
  ReactionSummary,
  CreatePostPayload,
  GetPostsParams,
  GetPostsResponse,
  FeedFilters,
  Connection,
  Repost,
} from '@clstr/core/api/social-api';

export { REACTION_EMOJI_MAP, REACTION_LABELS } from '@clstr/core/api/social-api';

const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;

// Bound API functions
export const createPost = withClient(_createPost);
export const getPosts = withClient(_getPosts);
export const getPostById = withClient(_getPostById);
export const getPostByIdPublic = withClient(_getPostByIdPublic);
export async function getPostsByUser(userId: string, params?: { cursor?: string | null; pageSize?: number }) {
  if (AUTH_MODE === 'mock') {
    return getMockPostsByUserData(userId, params);
  }
  return withClient(_getPostsByUser)(userId, params as any);
}

export async function getUserPostsCount(userId: string) {
  if (AUTH_MODE === 'mock') {
    return getMockUserPostsCountData(userId);
  }
  return withClient(_getUserPostsCount)(userId);
}
export const toggleReaction = withClient(_toggleReaction);
export const togglePostLike = withClient(_togglePostLike);
export const getComments = withClient(_getComments);
export const createComment = withClient(_createComment);
export const toggleCommentLike = withClient(_toggleCommentLike);
export const editComment = withClient(_editComment);
export const deleteComment = withClient(_deleteComment);
export const deletePost = withClient(_deletePost);
export const updatePost = withClient(_updatePost);
export const reportPost = withClient(_reportPost);
export const hidePost = withClient(_hidePost);
export const unhidePost = withClient(_unhidePost);
export const sharePost = withClient(_sharePost);
export const sharePostToMultiple = withClient(_sharePostToMultiple);
export const saveItem = withClient(_saveItem);
export const unsaveItem = withClient(_unsaveItem);
export const checkIfSaved = withClient(_checkIfSaved);
export const getSavedPosts = withClient(_getSavedPosts);
export async function toggleSavePost(postId: string) {
  if (AUTH_MODE === 'mock') {
    return toggleMockSavePostData(postId);
  }
  return withClient(_toggleSavePost)(postId);
}

export async function voteOnPoll(postId: string, optionIndex: number) {
  if (AUTH_MODE === 'mock') {
    return voteMockPollData();
  }
  return withClient(_voteOnPoll)(postId, optionIndex);
}
export const hasUserVotedOnPoll = withClient(_hasUserVotedOnPoll);
export const createRepost = withClient(_createRepost);
export const deleteRepost = withClient(_deleteRepost);
export const hasUserReposted = withClient(_hasUserReposted);
export const getPostReposts = withClient(_getPostReposts);
export const getFeedWithReposts = withClient(_getFeedWithReposts);
export const getTopCommentsBatch = withClient(_getTopCommentsBatch);
export const getTopComments = withClient(_getTopComments);
export async function countMutualConnections(viewerId: string, targetId: string) {
  if (AUTH_MODE === 'mock') {
    return countMockMutualConnectionsData();
  }
  return withClient(_countMutualConnections)(viewerId, targetId);
}
export const countMutualConnectionsBatch = withClient(_countMutualConnectionsBatch);

// Connection management
export async function getConnections() {
  if (AUTH_MODE === 'mock') {
    return getMockConnectionsData();
  }
  return withClient(_getConnections)();
}
export const getConnectionRequests = withClient(_getConnectionRequests);
export async function sendConnectionRequest(targetUserId: string) {
  if (AUTH_MODE === 'mock') {
    return sendMockConnectionRequestData(targetUserId);
  }
  return withClient(_sendConnectionRequest)(targetUserId);
}
export const acceptConnectionRequest = withClient(_acceptConnectionRequest);
export const rejectConnectionRequest = withClient(_rejectConnectionRequest);
export async function removeConnection(targetUserId: string) {
  if (AUTH_MODE === 'mock') {
    return removeMockConnectionData(targetUserId);
  }
  return withClient(_removeConnection)(targetUserId);
}

export async function checkConnectionStatus(targetUserId: string) {
  if (AUTH_MODE === 'mock') {
    return checkMockConnectionStatusData(targetUserId);
  }
  return withClient(_checkConnectionStatus)(targetUserId);
}
