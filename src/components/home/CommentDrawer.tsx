import { useMemo, useState, useEffect } from "react";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { MessageSquare, Send, X, ThumbsUp, Heart, Trash2, MoreHorizontal, Pencil, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Comment, toggleCommentLike, deleteComment, editComment } from "@/lib/social-api";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useProfile } from "@/contexts/ProfileContext";

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  comments: Comment[];
  isLoading?: boolean;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onRefresh?: () => void;
  onOpen?: () => void;
  initialReplyTarget?: { id: string; name: string } | null;
  onReplyTargetApplied?: () => void;
}

export function CommentDrawer({
  isOpen,
  onClose,
  comments,
  isLoading = false,
  onAddComment,
  onRefresh,
  onOpen,
  initialReplyTarget,
  onReplyTargetApplied,
}: CommentDrawerProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCommentOnPosts, canLikePosts } = useRolePermissions();
  const { profile } = useProfile();

  const totalComments = useMemo(() => {
    const countReplies = (items: Comment[]): number =>
      items.reduce((sum, item) => sum + 1 + (item.replies ? countReplies(item.replies) : 0), 0);
    return countReplies(comments);
  }, [comments]);

  useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  useEffect(() => {
    if (!isOpen) {
      setReplyTo(null);
      return;
    }
    if (initialReplyTarget) {
      setReplyTo(initialReplyTarget);
      onReplyTargetApplied?.();
    }
  }, [initialReplyTarget, isOpen, onReplyTargetApplied]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    if (!canCommentOnPosts) {
      toast({
        title: "Action not allowed",
        description: "Your role cannot add comments.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAddComment(newComment, replyTo?.id || undefined);
      setNewComment("");
      setReplyTo(null);
    } catch (error) {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      {/* Desktop: right panel 60vh max | Mobile: bottom sheet 60vh */}
      <SheetContent 
        side="bottom" 
        className="home-theme h-[60vh] max-h-[60vh] md:h-[50vh] md:max-h-[50vh] p-0 rounded-t-2xl md:rounded-t-xl bg-[#000000] border-white/10 text-white"
      >
        {/* Drag handle indicator for mobile */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        
        <SheetHeader className="px-6 py-3 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({totalComments})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(60vh-180px)] md:h-[calc(50vh-180px)] px-6 py-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                      <div className="h-16 bg-white/[0.06] rounded-lg" />
                      <div className="h-3 w-32 bg-white/[0.06] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-white/40">No comments yet â€” be the first to share your thoughts.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={(target) => setReplyTo({ id: target.id, name: target.user?.full_name || "Unknown User" })}
                  onRefresh={onRefresh}
                  queryClient={queryClient}
                  canLike={canLikePosts}
                  currentUserId={profile?.id}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/90 p-4">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-sm text-white/60">
              <span>Replying to {replyTo.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
              disabled={!canCommentOnPosts}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || !canCommentOnPosts}
              className="bg-white/15 hover:bg-white/20 text-white border border-white/15"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentItem({
  comment,
  onReply,
  onRefresh,
  queryClient,
  canLike,
  currentUserId,
}: {
  comment: Comment;
  onReply: (target: Comment) => void;
  onRefresh?: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
  canLike: boolean;
  currentUserId?: string;
}) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const isOwnComment = currentUserId && comment.user_id === currentUserId;

  const handleLike = async () => {
    if (isLiking) return;
    if (!canLike) {
      toast({
        title: "Action not allowed",
        description: "Your role cannot like comments.",
        variant: "destructive",
      });
      return;
    }
    setIsLiking(true);

    try {
      await toggleCommentLike(comment.id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.postComments(comment.post_id) });
      onRefresh?.();
    } catch (error) {
      toast({
        title: 'Failed to like comment',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleEdit = async () => {
    if (isSavingEdit || !editContent.trim()) return;
    setIsSavingEdit(true);

    try {
      await editComment(comment.id, editContent.trim());
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.postComments(comment.post_id) });
      onRefresh?.();
      setIsEditing(false);
      toast({
        title: "Comment updated",
        description: "Your comment has been updated",
      });
    } catch (error) {
      toast({
        title: 'Failed to update comment',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setIsRemoved(true);

    try {
      await deleteComment(comment.id);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.postComments(comment.post_id) });
      // Also invalidate feed queries to update comment counts
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key.includes("home-feed") || key.includes("feed-posts") || key.includes("profile-posts");
        },
      });
      onRefresh?.();
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted",
      });
    } catch (error) {
      setIsRemoved(false);
      toast({
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  const isEdited = new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;

  if (isRemoved) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url || undefined} />
          <AvatarFallback>
            {comment.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-white/[0.06] rounded-lg p-3 relative group border border-white/10">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-sm text-white">{comment.user?.full_name || 'Unknown User'}</p>
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
                    <DropdownMenuItem onClick={() => {
                      setEditContent(comment.content);
                      setIsEditing(true);
                    }}>
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
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  disabled={isSavingEdit}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    disabled={!editContent.trim() || isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 text-white/80 whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>
          <div className="flex gap-4 mt-1 text-xs text-white/40">
            <span>{timeAgo}{isEdited ? ' (edited)' : ''}</span>
            <button 
              onClick={handleLike}
              disabled={isLiking || !canLike}
              className={`hover:underline flex items-center gap-1 ${comment.liked ? 'text-red-500' : ''}`}
            >
              {comment.liked ? (
                <Heart className="h-3 w-3 fill-current" />
              ) : (
                <ThumbsUp className="h-3 w-3" />
              )}
              {comment.likes_count} {comment.likes_count === 1 ? 'Like' : 'Likes'}
            </button>
            <button onClick={() => onReply(comment)} className="hover:underline">Reply</button>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onRefresh={onRefresh}
              queryClient={queryClient}
              canLike={canLike}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
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
