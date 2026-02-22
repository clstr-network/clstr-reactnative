/**
 * Social API adapter — Feed, posts, reactions, comments.
 * Binds @clstr/core social-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
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

// Bound API functions
export const createPost = withClient(_createPost);
export const getPosts = withClient(_getPosts);
export const getPostById = withClient(_getPostById);
export const getPostByIdPublic = withClient(_getPostByIdPublic);
export const getPostsByUser = withClient(_getPostsByUser);
export const getUserPostsCount = withClient(_getUserPostsCount);
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
export const toggleSavePost = withClient(_toggleSavePost);
export const voteOnPoll = withClient(_voteOnPoll);
export const hasUserVotedOnPoll = withClient(_hasUserVotedOnPoll);
export const createRepost = withClient(_createRepost);
export const deleteRepost = withClient(_deleteRepost);
export const hasUserReposted = withClient(_hasUserReposted);
export const getPostReposts = withClient(_getPostReposts);
export const getFeedWithReposts = withClient(_getFeedWithReposts);
export const getTopCommentsBatch = withClient(_getTopCommentsBatch);
export const getTopComments = withClient(_getTopComments);
export const countMutualConnections = withClient(_countMutualConnections);
export const countMutualConnectionsBatch = withClient(_countMutualConnectionsBatch);
