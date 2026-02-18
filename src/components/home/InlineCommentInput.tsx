import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Comment, editComment, deleteComment } from '@/lib/social-api';
import { useProfile } from '@/contexts/ProfileContext';
import { cn } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';

interface InlineCommentInputProps {
  postId: string;
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function InlineCommentInput({
  postId,
  onSubmit,
  placeholder = "Add a comment...",
  autoFocus = false,
  disabled = false,
}: InlineCommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(autoFocus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { profile } = useProfile();

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

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
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
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
          {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="min-h-[60px] resize-none text-sm bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
          rows={2}
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

// Preview component for top comments shown inline
interface TopCommentsPreviewProps {
  comments: Comment[];
  totalCount: number;
  onViewAll: () => void;
  onReply?: (commentId: string, authorName: string) => void;
  onCommentUpdated?: () => void;
}

export function TopCommentsPreview({
  comments,
  totalCount,
  onViewAll,
  onReply,
  onCommentUpdated,
}: TopCommentsPreviewProps) {
  // Empty state - show muted informational text
  if (comments.length === 0 && totalCount === 0) {
    return (
      <p className="text-xs text-white/40 text-center py-3">
        No comments yet — be the first to share your thoughts.
      </p>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {comments.map((comment) => (
        <InlineComment 
          key={comment.id} 
          comment={comment} 
          onReply={onReply}
          onCommentUpdated={onCommentUpdated}
        />
      ))}
      
      {totalCount > comments.length && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-white/45 hover:text-white/70 p-0 h-auto font-normal"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          View all {totalCount} comments
        </Button>
      )}
    </div>
  );
}

// Single inline comment display
interface InlineCommentProps {
  comment: Comment;
  onReply?: (commentId: string, authorName: string) => void;
  onCommentUpdated?: () => void;
}

function InlineComment({ comment, onReply, onCommentUpdated }: InlineCommentProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnComment = profile?.id === comment.user_id;
  const isEdited = new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  const handleSaveEdit = async () => {
    if (!editedText.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await editComment(comment.id, editedText.trim());
      setIsEditing(false);
      onCommentUpdated?.();
      toast({ title: 'Comment updated', description: 'Your changes were saved.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update comment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      onCommentUpdated?.();
      toast({ title: 'Comment deleted', description: 'Your comment was removed.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete comment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex gap-2 animate-in fade-in duration-200">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage src={comment.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {comment.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-white/[0.04] rounded-lg px-3 py-2">
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
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditedText(comment.content); setIsEditing(true); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
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
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
          <span>{timeAgo}{isEdited ? ' (edited)' : ''}</span>
          {comment.likes_count > 0 && (
            <span>{comment.likes_count} like{comment.likes_count !== 1 ? 's' : ''}</span>
          )}
          {onReply && (
            <button
              onClick={() => onReply(comment.id, comment.user?.full_name || 'Anonymous')}
              className="hover:text-white/70 transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>

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
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
