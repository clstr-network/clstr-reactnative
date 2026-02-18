import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Comment as CommentType, createComment, toggleCommentLike, editComment, deleteComment } from "@/lib/social-api";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { formatDistanceToNow } from "date-fns";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { UserBadge } from "@/components/ui/user-badge";
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

interface PostCommentsProps {
  postId: string;
  comments: CommentType[];
  onCommentAdded: () => void;
}

interface CommentItemProps {
  comment: CommentType;
  onReply: (parentId: string) => void;
  onLike: (commentId: string) => void;
  onCommentUpdated: () => void;
  depth?: number;
}

const CommentItem = ({ comment, onReply, onLike, onCommentUpdated, depth = 0 }: CommentItemProps) => {
  const { canLikePosts } = useRolePermissions();
  const { profile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwnComment = profile?.id === comment.user_id;
  const isEdited = new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;

  const handleReply = () => {
    onReply(comment.id);
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await editComment(comment.id, editedText.trim());
      setIsEditing(false);
      onCommentUpdated();
      toast({ title: "Comment updated", description: "Your changes were saved." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to edit comment";
      toast({
        title: "Error updating comment",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      onCommentUpdated();
      toast({ title: "Comment deleted", description: "Your comment was deleted." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to delete comment";
      toast({
        title: "Error deleting comment",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div id={`comment-${comment.id}`} className={`${depth > 0 ? "ml-8 mt-3" : "mt-4"} space-y-2`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url || undefined} alt={comment.user?.full_name || "User"} />
          <AvatarFallback>
            {comment.user?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-white/[0.06] rounded-lg px-3 py-2 border border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-semibold text-sm text-white truncate">{comment.user?.full_name}</span>
                {comment.user?.role && (
                  <UserBadge userType={comment.user.role} size="sm" />
                )}
              </div>
              {isOwnComment && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
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
                  className="min-h-[60px] resize-none bg-white/[0.04] border-white/10 text-white"
                  disabled={isSaving}
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
                  <Button size="sm" onClick={handleSaveEdit} disabled={!editedText.trim() || isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 text-white/80 whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>
          <div className="flex items-center space-x-4 mt-1 ml-3">
            <button
              onClick={() => onLike(comment.id)}
              className={`text-xs ${
                comment.liked ? "text-red-500 font-semibold" : "text-white/50"
              } hover:text-white/70 transition-colors`}
              disabled={!canLikePosts}
            >
              {comment.liked ? "Liked" : "Like"} {comment.likes_count > 0 && `(${comment.likes_count})`}
            </button>
            <button
              onClick={handleReply}
              className="text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              Reply
            </button>
            <span className="text-xs text-white/40">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              {isEdited ? " (edited)" : ""}
            </span>
          </div>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onCommentUpdated={onCommentUpdated}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const PostComments = ({ postId, comments, onCommentAdded }: PostCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useProfile();
  const { canCommentOnPosts, canLikePosts } = useRolePermissions();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!canCommentOnPosts) {
      toast({
        title: "Action not allowed",
        description: "Your role cannot add comments.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({
        post_id: postId,
        content: newComment.trim(),
        parent_id: replyToId || undefined,
      });
      
      setNewComment("");
      setReplyToId(null);
      onCommentAdded();
      
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully!",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to post comment";
      toast({
        title: "Error posting comment",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      if (!canLikePosts) {
        toast({
          title: "Action not allowed",
          description: "Your role cannot like comments.",
          variant: "destructive",
        });
        return;
      }
      await toggleCommentLike(commentId);
      onCommentAdded(); // Refresh comments
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to update like";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleReply = (parentId: string) => {
    setReplyToId(parentId);
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {/* Comment Input */}
      <div className="flex space-x-3 mb-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
          <AvatarFallback>
            {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex space-x-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyToId ? "Write a reply..." : "Add a comment..."}
            className="min-h-[60px] resize-none bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
            disabled={!canCommentOnPosts}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSubmitComment();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting || !canCommentOnPosts}
            className="self-end bg-white/[0.06] hover:bg-white/10 text-white border border-white/10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {replyToId && (
        <div className="mb-2 text-xs text-white/50">
          Replying to a comment.{" "}
          <button
            onClick={() => setReplyToId(null)}
            className="text-white/70 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-1">
        {comments.length === 0 ? (
          <p className="text-center text-white/40 text-sm py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onLike={handleLikeComment}
              onCommentUpdated={onCommentAdded}
            />
          ))
        )}
      </div>
    </div>
  );
};
