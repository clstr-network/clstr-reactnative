/**
 * social-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/social-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/social-api';
import { withClient } from '@/adapters/bind';

export const createPost = withClient(_core.createPost);
export const getPosts = withClient(_core.getPosts);
export const getPostsByUser = withClient(_core.getPostsByUser);
export const getUserPostsCount = withClient(_core.getUserPostsCount);
export const getPostByIdPublic = withClient(_core.getPostByIdPublic);
export const getPostById = withClient(_core.getPostById);
export const getConnectionStatusesForUsers = withClient(_core.getConnectionStatusesForUsers);
export const togglePostLike = withClient(_core.togglePostLike);
export const toggleLike = withClient(_core.toggleLike);
export const toggleReaction = withClient(_core.toggleReaction);
export const getPostTopReactions = withClient(_core.getPostTopReactions);
export const getUserReaction = withClient(_core.getUserReaction);
export const likePost = withClient(_core.likePost);
export const unlikePost = withClient(_core.unlikePost);
export const deletePost = withClient(_core.deletePost);
export const updatePost = withClient(_core.updatePost);
export const getComments = withClient(_core.getComments);
export const createComment = withClient(_core.createComment);
export const toggleCommentLike = withClient(_core.toggleCommentLike);
export const editComment = withClient(_core.editComment);
export const deleteComment = withClient(_core.deleteComment);
export const sendConnectionRequest = withClient(_core.sendConnectionRequest);
export const cancelConnectionRequest = withClient(_core.cancelConnectionRequest);
export const getConnectionRequests = withClient(_core.getConnectionRequests);
export const getConnections = withClient(_core.getConnections);
export const updateConnectionStatus = withClient(_core.updateConnectionStatus);
export const acceptConnectionRequest = withClient(_core.acceptConnectionRequest);
export const rejectConnectionRequest = withClient(_core.rejectConnectionRequest);
export const removeConnection = withClient(_core.removeConnection);
export const checkConnectionStatus = withClient(_core.checkConnectionStatus);
export const sendMessage = withClient(_core.sendMessage);
export const getConversations = withClient(_core.getConversations);
export const getMessages = withClient(_core.getMessages);
export const markMessagesAsRead = withClient(_core.markMessagesAsRead);
export const reportPost = withClient(_core.reportPost);
export const undoReportPost = withClient(_core.undoReportPost);
export const hidePost = withClient(_core.hidePost);
export const unhidePost = withClient(_core.unhidePost);
// Compat wrappers: sharePost/sharePostToMultiple inject web appUrl
import { supabase } from '@/adapters/core-client';

const _appUrl = typeof window !== 'undefined' ? window.location.origin : '';

export const sharePost = (data: {
  original_post_id: string;
  content?: string;
  share_type: 'dm';
  receiver_id: string;
}) => _core.sharePost(supabase, data, _appUrl);

export const sharePostToMultiple = (data: {
  original_post_id: string;
  content?: string;
  receiver_ids: string[];
}) => _core.sharePostToMultiple(supabase, data, _appUrl);
export const saveItem = withClient(_core.saveItem);
export const unsaveItem = withClient(_core.unsaveItem);
export const checkIfSaved = withClient(_core.checkIfSaved);
export const getSavedPosts = withClient(_core.getSavedPosts);
export const toggleSavePost = withClient(_core.toggleSavePost);
export const voteOnPoll = withClient(_core.voteOnPoll);
export const hasUserVotedOnPoll = withClient(_core.hasUserVotedOnPoll);
export const countMutualConnections = withClient(_core.countMutualConnections);
export const countMutualConnectionsBatch = withClient(_core.countMutualConnectionsBatch);
export const createRepost = withClient(_core.createRepost);
export const deleteRepost = withClient(_core.deleteRepost);
export const hasUserReposted = withClient(_core.hasUserReposted);
export const getPostReposts = withClient(_core.getPostReposts);
export const getFeedWithReposts = withClient(_core.getFeedWithReposts);
export const getTopCommentsBatch = withClient(_core.getTopCommentsBatch);
export const getTopComments = withClient(_core.getTopComments);
