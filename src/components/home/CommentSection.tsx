/**
 * CommentSection – LinkedIn-style inline threaded comment system.
 *
 * Replaces the old drawer-based engagement model.
 * - All comments render inline below the post
 * - Reply opens an inline input under the specific comment (local state)
 * - Optimistic cache updates for add / delete / like
 * - Real-time subscription keeps the list fresh
 * - Max 2 levels of nesting (top-level + replies)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  ThumbsUp,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Comment,
  getComments,
  createComment,
  deleteComment,
  editComment,
  toggleCommentLike,
} from '@/lib/social-api';
import { useProfile } from '@/contexts/ProfileContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { updateCommentCountInFeeds } from './comment-utils';
import { formatDistanceToNow } from 'date-fns';
import { UserBadge } from '@/components/ui/user-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MAX_NESTING_DEPTH = 1; // 0 = top-level, 1 = reply → 2 visible levels
const INITIAL_COMMENTS_SHOW = 3; // Show first N top-level comments; user clicks to expand
const INITIAL_REPLIES_SHOW = 2; // Show first N replies per comment; user clicks to expand

/* ------------------------------------------------------------------ */
/*  CommentSection                                                     */
/* ------------------------------------------------------------------ */

interface CommentSectionProps {
  postId: string;
  commentsCount: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function CommentSection({
  postId,
  commentsCount,
  disabled = false,
  autoFocus = false,
}: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { canCommentOnPosts } = useRolePermissions();
  const { toast } = useToast();
  const commentsQueryKey = useMemo(() => ['post-comments', postId] as const, [postId]);

  // Single active reply input — only one reply box open at a time (LinkedIn-style)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // Pagination — show limited comments initially, expand on demand
  const [showAllComments, setShowAllComments] = useState(false);

  /* ---- Fetch all comments ---- */
  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => getComments(postId),
    staleTime: 1000 * 10,
  });

  /* ---- Real-time subscription ---- */
  useEffect(() => {
    const channel = supabase
      .channel(`inline-comments-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey: commentsQueryKey }),
      )
      // NOTE: comment_likes subscription intentionally removed — it cannot be
      // filtered by post_id (column doesn't exist on that table), so it would
      // fire for every like across the entire platform. Own likes are handled
      // optimistically; other users' likes sync on the next comments refetch.
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentsQueryKey, postId, queryClient]);

  /* ---- Add comment with optimistic update ---- */
  const handleAddComment = useCallback(
    async (content: string, parentId?: string) => {
      if (!canCommentOnPosts) {
        toast({
          title: 'Action not allowed',
          description: 'Your role cannot add comments.',
          variant: 'destructive',
        });
        return;
      }

      const optimistic: Comment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user_id: profile?.id || '',
        parent_id: parentId,
        content,
        likes_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: profile
          ? {
              id: profile.id,
              full_name: profile.full_name || 'You',
              avatar_url: profile.avatar_url || '',
              role: profile.role || 'Member',
            }
          : undefined,
        replies: [],
        liked: false,
      };

      // Optimistic: add to cache
      queryClient.setQueryData(commentsQueryKey, (old: Comment[] | undefined) => {
        if (!old) return [optimistic];
        if (parentId) {
          const addReply = (list: Comment[]): Comment[] =>
            list.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies || []), optimistic] }
                : { ...c, replies: c.replies ? addReply(c.replies) : [] },
            );
          return addReply(old);
        }
        return [...old, optimistic];
      });

      // Optimistic: increment count (top-level only)
      if (!parentId) {
        updateCommentCountInFeeds(queryClient, postId, 1);
      }

      try {
        await createComment({ post_id: postId, content, parent_id: parentId });
        queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      } catch (error) {
        // Rollback
        queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        if (!parentId) {
          updateCommentCountInFeeds(queryClient, postId, -1);
        }
        toast({
          title: 'Failed to add comment',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      }
    },
    [canCommentOnPosts, commentsQueryKey, postId, profile, queryClient, toast],
  );

  /* ---- Render ---- */
  return (
    <div className="space-y-3 pt-3 border-t border-white/10">
      {/* New comment input */}
      <NewCommentInput
        onSubmit={(content) => handleAddComment(content)}
        disabled={disabled || !canCommentOnPosts}
        autoFocus={autoFocus}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-16 bg-white/[0.06] rounded-lg" />
                <div className="h-3 w-24 bg-white/[0.06] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-white/40 text-center py-3">
          No comments yet — be the first to share your thoughts.
        </p>
      )}

      {/* Comment list — paginated */}
      {!isLoading && comments.length > 0 && (
        <div className="space-y-1">
          {(showAllComments ? comments : comments.slice(0, INITIAL_COMMENTS_SHOW)).map(
            (comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                depth={0}
                commentsQueryKey={commentsQueryKey}
                onAddReply={handleAddComment}
                activeReplyId={activeReplyId}
                setActiveReplyId={setActiveReplyId}
              />
            ),
          )}
          {!showAllComments && comments.length > INITIAL_COMMENTS_SHOW && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-xs text-white/50 hover:text-white/80 transition-colors pl-10 py-1 font-medium"
            >
              View all {comments.length} comments
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NewCommentInput                                                    */
/* ------------------------------------------------------------------ */

interface NewCommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}

function NewCommentInput({
  onSubmit,
  disabled = false,
  autoFocus = false,
  placeholder = 'Add a comment...',
}: NewCommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(autoFocus);
  const { profile } = useProfile();

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent('');
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setContent('');
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className="w-full flex items-center gap-2 p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-left text-white/40 text-sm"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {profile?.full_name?.split(' ').map((n) => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1">{placeholder}</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200 bg-white/[0.04] rounded-lg p-3 border border-white/10">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback>
          {profile?.full_name?.split(' ').map((n) => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="min-h-[60px] resize-none text-sm bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
          rows={2}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsExpanded(false);
              setContent('');
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-white/10 hover:bg-white/15 text-white border border-white/10"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CommentItem – single comment with local reply state                */
/* ------------------------------------------------------------------ */

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth: number;
  commentsQueryKey: readonly ['post-comments', string];
  onAddReply: (content: string, parentId?: string) => Promise<void>;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
}

function CommentItem({
  comment,
  postId,
  depth,
  commentsQueryKey,
  onAddReply,
  activeReplyId,
  setActiveReplyId,
}: CommentItemProps) {
  const isReplying = activeReplyId === comment.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const { profile } = useProfile();
  const { canLikePosts, canCommentOnPosts } = useRolePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOwnComment = profile?.id === comment.user_id;
  const isEdited =
    new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  const canNestReplies = depth < MAX_NESTING_DEPTH;

  /* ---- Reply (inline, local state) ---- */
  const handleSubmitReply = async () => {
    const trimmed = replyContent.trim();
    if (!trimmed || isSubmittingReply) return;
    if (!canCommentOnPosts) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot add comments.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingReply(true);
    try {
      await onAddReply(trimmed, comment.id);
      setReplyContent('');
      setActiveReplyId(null);
    } catch {
      // Error handled upstream
    } finally {
      setIsSubmittingReply(false);
    }
  };

  /* ---- Edit ---- */
  const handleSaveEdit = async () => {
    if (!editedText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await editComment(comment.id, editedText.trim());
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      toast({ title: 'Comment updated', description: 'Your changes were saved.' });
    } catch (error) {
      toast({
        title: 'Error updating comment',
        description: error instanceof Error ? error.message : 'Failed to update',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /* ---- Delete (optimistic) ---- */
  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const isTopLevel = !comment.parent_id;

    // Optimistic: remove from cache
    queryClient.setQueryData(commentsQueryKey, (old: Comment[] | undefined) => {
      if (!old) return old;
      const remove = (list: Comment[]): Comment[] =>
        list
          .filter((c) => c.id !== comment.id)
          .map((c) => ({ ...c, replies: c.replies ? remove(c.replies) : [] }));
      return remove(old);
    });

    if (isTopLevel) {
      updateCommentCountInFeeds(queryClient, postId, -1);
    }

    try {
      await deleteComment(comment.id);
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      toast({ title: 'Comment deleted' });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      if (isTopLevel) {
        updateCommentCountInFeeds(queryClient, postId, 1);
      }
      toast({
        title: 'Error deleting comment',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  /* ---- Like (optimistic) ---- */
  const handleLike = async () => {
    if (isLiking) return;
    if (!canLikePosts) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot like comments.',
        variant: 'destructive',
      });
      return;
    }
    setIsLiking(true);

    // Optimistic toggle
    queryClient.setQueryData(commentsQueryKey, (old: Comment[] | undefined) => {
      if (!old) return old;
      const toggle = (list: Comment[]): Comment[] =>
        list.map((c) =>
          c.id === comment.id
            ? {
                ...c,
                liked: !c.liked,
                likes_count: c.liked
                  ? Math.max(0, c.likes_count - 1)
                  : c.likes_count + 1,
              }
            : { ...c, replies: c.replies ? toggle(c.replies) : [] },
        );
      return toggle(old);
    });

    try {
      await toggleCommentLike(comment.id);
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      toast({
        title: 'Failed to like comment',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
    if (e.key === 'Escape') {
      setActiveReplyId(null);
      setReplyContent('');
    }
  };

  /* ---- Render ---- */
  return (
    <div id={`comment-${comment.id}`} className={depth > 0 ? 'ml-8 mt-2' : 'mt-3'}>
      {/* Comment body */}
      <div className="flex gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {comment.user?.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-white/[0.04] rounded-lg px-3 py-2 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-sm truncate">
                  {comment.user?.full_name || 'Anonymous'}
                </span>
                {comment.user?.role && (
                  <UserBadge userType={comment.user.role} size="sm" />
                )}
              </div>
              {isOwnComment && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditedText(comment.content);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[60px] resize-none text-sm bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
                  disabled={isSaving}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(comment.content);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editedText.trim() || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-3 mt-1 ml-1 text-xs text-white/40">
            <span>
              {timeAgo}
              {isEdited ? ' (edited)' : ''}
            </span>
            <button
              onClick={handleLike}
              disabled={isLiking || !canLikePosts}
              className={`hover:text-white/70 transition-colors flex items-center gap-1 ${
                comment.liked ? 'text-red-400 font-medium' : ''
              }`}
            >
              {comment.liked ? (
                <Heart className="h-3 w-3 fill-current" />
              ) : (
                <ThumbsUp className="h-3 w-3" />
              )}
              {comment.likes_count > 0 && comment.likes_count}
              {comment.likes_count === 1 ? ' Like' : ' Likes'}
            </button>
            {canNestReplies && (
              <button
                onClick={() => {
                  if (isReplying) {
                    setActiveReplyId(null);
                    setReplyContent('');
                  } else {
                    setActiveReplyId(comment.id);
                    setReplyContent('');
                  }
                }}
                className="hover:text-white/70 transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline reply input — controlled by local isReplying state */}
      {isReplying && (
        <div className="ml-10 mt-2 flex gap-2 items-start animate-in fade-in slide-in-from-top-2 duration-200">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {profile?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              placeholder={`Reply to ${comment.user?.full_name || 'Anonymous'}...`}
              disabled={isSubmittingReply}
              className="min-h-[50px] resize-none text-sm bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveReplyId(null);
                  setReplyContent('');
                }}
                disabled={isSubmittingReply}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="bg-white/10 hover:bg-white/15 text-white border border-white/10"
              >
                {isSubmittingReply ? 'Replying...' : 'Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replies (max 2 levels) — paginated */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {(showAllReplies
            ? comment.replies
            : comment.replies.slice(0, INITIAL_REPLIES_SHOW)
          ).map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              commentsQueryKey={commentsQueryKey}
              onAddReply={onAddReply}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
            />
          ))}
          {!showAllReplies &&
            comment.replies.length > INITIAL_REPLIES_SHOW && (
              <button
                onClick={() => setShowAllReplies(true)}
                className="text-xs text-white/50 hover:text-white/80 transition-colors ml-10 py-1 font-medium"
              >
                View {comment.replies.length - INITIAL_REPLIES_SHOW} more{' '}
                {comment.replies.length - INITIAL_REPLIES_SHOW === 1
                  ? 'reply'
                  : 'replies'}
              </button>
            )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be
              undone.
              {comment.replies && comment.replies.length > 0 && (
                <span className="block mt-2 text-amber-600">
                  Note: This will also delete all replies to this comment.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
