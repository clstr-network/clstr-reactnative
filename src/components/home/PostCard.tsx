import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Repeat2, MoreHorizontal, Edit, Trash2, Bookmark, Flag, EyeOff, Eye, FileText, ExternalLink } from 'lucide-react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cardHoverVariants, expandVariants, iconPress } from '@/lib/animations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Post, 
  toggleReaction, 
  deletePost, 
  updatePost, 
  reportPost, 
  undoReportPost,
  hidePost, 
  unhidePost,
  voteOnPoll, 
  hasUserVotedOnPoll, 
  toggleSavePost,
  ReactionType,
  ReactionCount,
  REACTION_EMOJI_MAP,
} from '@/lib/social-api';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ToastAction } from '@/components/ui/toast';
import { ShareModal } from './ShareModal';
import { RepostModal } from './RepostModal';
import { ReactionPicker, ReactionDisplay } from './ReactionPicker';
import { CommentSection } from './CommentSection';
import { useProfile } from '@/contexts/ProfileContext';
import { useQueryClient } from '@tanstack/react-query';
import { updateCommentCountInFeeds } from './comment-utils';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { UserBadge } from '@/components/ui/user-badge';

/** Compact relative timestamp: "1m", "3h", "2d", "4w", "Jan 5" */
function shortRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  // Older than ~1 month → short date
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PostCardProps {
  post: Post;
  onPostUpdated?: () => void;
  /** Auto-expand comments section (used on post detail page) */
  autoShowComments?: boolean;
}

export function PostCard({ post, onPostUpdated, autoShowComments = false }: PostCardProps) {
  const [isReacting, setIsReacting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollVoting, setPollVoting] = useState<number | null>(null);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [localPoll, setLocalPoll] = useState(post.poll);
  const [showInlineComments, setShowInlineComments] = useState(autoShowComments);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // LinkedIn-style engagement state
  const [userReaction, setUserReaction] = useState<ReactionType | null>(post.userReaction || (post.liked ? 'like' : null));
  const [topReactions, setTopReactions] = useState<ReactionCount[]>(post.topReactions || []);
  const [totalReactions, setTotalReactions] = useState(post.likes_count || 0);
  
  const { toast } = useToast();
  const { profile } = useProfile();
  const { canLikePosts, canCommentOnPosts, canSharePosts, canEditOwnContent, canDeleteOwnContent, canReportContent } = useRolePermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isOnPostDetail = location.pathname === `/post/${post.id}`;

  // LinkedIn-style navigation handlers
  // Mobile: tap card body → post detail
  // Desktop: click timestamp → post detail, click author → profile
  const handleAuthorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const userId = post.user?.id || post.user_id;
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  }, [navigate, post.user?.id, post.user_id]);

  const handleTimestampClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${post.id}`);
  }, [navigate, post.id]);

  const handleCardBodyClick = useCallback((e: React.MouseEvent) => {
    // Only navigate on mobile - desktop stays inline (LinkedIn behavior)
    if (!isMobile) return;

    // Prevent reload loop: don't navigate if already on this post's detail page
    if (isOnPostDetail) return;
    
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, [role="button"], input, textarea, video, iframe, [data-interactive]');
    if (isInteractive) return;

    navigate(`/post/${post.id}`);
  }, [isMobile, navigate, post.id, isOnPostDetail]);

  const isOwnPost = profile?.id === post.user_id || profile?.id === post.user?.id;
  const isSaved = Boolean(post.saved);
  const isReposted = Boolean(post.reposted);
  const activePoll = localPoll ?? post.poll;
  const pollEndDate = activePoll ? new Date(activePoll.endDate) : null;
  const isPollClosed = pollEndDate ? pollEndDate.getTime() < Date.now() : false;

  useEffect(() => {
    setLocalPoll(post.poll);
  }, [post.poll]);

  useEffect(() => {
    setEditContent(post.content);
  }, [post.content]);

  // Check if user has already voted on this poll
  useEffect(() => {
    if (!post.poll || !profile?.id) return;

    const checkVoteStatus = async () => {
      try {
        const hasVoted = await hasUserVotedOnPoll(post.id);
        setUserHasVoted(hasVoted);
      } catch (error) {
        console.error('Error checking poll vote status:', error);
      }
    };

    checkVoteStatus();
  }, [post.id, post.poll, profile?.id]);

  const invalidatePostQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return key.includes("home-feed") || key.includes("feed-posts") || key.includes("profile-posts") || key.includes("saved-items") || key.includes("post-detail");
      },
    });
  };

  // Sync reaction state from props
  useEffect(() => {
    setUserReaction(post.userReaction || (post.liked ? 'like' : null));
    setTotalReactions(post.likes_count || 0);
    if (post.topReactions) {
      setTopReactions(post.topReactions);
    }
  }, [post.userReaction, post.liked, post.likes_count, post.topReactions]);

  // LinkedIn-style reaction handler with optimistic updates
  const handleReaction = async (reactionType: ReactionType) => {
    if (isReacting) return;
    if (!canLikePosts) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot react to posts.',
        variant: 'destructive',
      });
      return;
    }

    setIsReacting(true);
    
    // Optimistic update
    const previousReaction = userReaction;
    const previousTotal = totalReactions;
    
    if (userReaction === reactionType) {
      // Removing reaction
      setUserReaction(null);
      setTotalReactions(prev => Math.max(0, prev - 1));
    } else if (userReaction) {
      // Changing reaction
      setUserReaction(reactionType);
    } else {
      // Adding reaction
      setUserReaction(reactionType);
      setTotalReactions(prev => prev + 1);
    }

    try {
      const result = await toggleReaction(post.id, reactionType);
      
      // Update with server response
      setUserReaction(result.reaction);
      setTotalReactions(result.totalReactions);
      setTopReactions(result.topReactions);
      
      // Update React Query cache optimistically across all feed query keys
      const updatePostInCache = (old: any) => {
        if (!old) return old;
        // Handle infinite query shape (pages array)
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts?.map((p: any) => 
                p.id === post.id 
                  ? { 
                      ...p, 
                      userReaction: result.reaction,
                      liked: result.reaction !== null,
                      likes_count: result.totalReactions,
                      topReactions: result.topReactions,
                    }
                  : p
              ),
            })),
          };
        }
        return old;
      };

      queryClient.setQueriesData(
        { predicate: (q) => q.queryKey.includes('home-feed') || q.queryKey.includes('feed-posts') },
        updatePostInCache
      );
      
      onPostUpdated?.();
    } catch (error: unknown) {
      // Revert on error
      setUserReaction(previousReaction);
      setTotalReactions(previousTotal);
      
      const description = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Action failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsReacting(false);
    }
  };

  const handleSavePost = async () => {
    if (isSaving || !profile?.id) return;
    
    setIsSaving(true);
    
    try {
      const result = await toggleSavePost(post.id);

      const applySavedStateToCache = (savedState: boolean) => {
        const updateSavedInCache = (old: any) => {
          if (!old) return old;
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                posts: page.posts?.map((p: any) =>
                  p.id === post.id ? { ...p, saved: savedState } : p
                ),
              })),
            };
          }
          return old;
        };

        queryClient.setQueriesData(
          { predicate: (q) => q.queryKey.includes('home-feed') || q.queryKey.includes('feed-posts') || q.queryKey.includes('saved-items') },
          updateSavedInCache
        );
      };
      
      toast({
        title: result.saved ? 'Post saved' : 'Post unsaved',
        description: result.saved 
          ? 'Saved to your items.'
          : 'Removed from saved items.',
        action: (
          <ToastAction
            altText="Undo save action"
            className="h-9 min-w-[68px] px-3.5 text-sm sm:h-8 sm:min-w-0 sm:px-3"
            onClick={async () => {
              try {
                const undoResult = await toggleSavePost(post.id);
                applySavedStateToCache(undoResult.saved);
                onPostUpdated?.();
                toast({
                  title: 'Action undone',
                  description: undoResult.saved ? 'Saved again.' : 'Removed again.',
                });
              } catch (error) {
                toast({
                  title: 'Undo failed',
                  description: error instanceof Error ? error.message : 'Please try again',
                  variant: 'destructive',
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });

      applySavedStateToCache(result.saved);
      
      onPostUpdated?.();
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoteOnPoll = async (optionIndex: number) => {
    if (pollVoting !== null || userHasVoted || !profile?.id || !activePoll) return;
    if (isPollClosed) {
      toast({
        title: 'Poll closed',
        description: 'This poll has ended.',
        variant: 'destructive',
      });
      return;
    }

    setPollVoting(optionIndex);

    try {
      const updatedPoll = await voteOnPoll(post.id, optionIndex);
      setLocalPoll(updatedPoll);
      setUserHasVoted(true);

      toast({
        title: 'Vote recorded',
        description: 'Your vote has been saved.',
      });

      await invalidatePostQueries();
      onPostUpdated?.();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Failed to vote',
        description,
        variant: 'destructive',
      });
    } finally {
      setPollVoting(null);
    }
  };

  const handleReportPost = async () => {
    if (!canReportContent) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot report content.',
        variant: 'destructive',
      });
      return;
    }
    if (!reportReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for reporting',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await reportPost(post.id, reportReason);
      toast({
        title: 'Post reported',
        description: 'Thanks for your report.',
        action: (
          <ToastAction
            altText="Undo report post"
            className="h-9 min-w-[68px] px-3.5 text-sm sm:h-8 sm:min-w-0 sm:px-3"
            onClick={async () => {
              try {
                await undoReportPost(post.id);
                toast({
                  title: 'Report removed',
                  description: 'Report undone.',
                });
              } catch (error) {
                toast({
                  title: 'Undo failed',
                  description: error instanceof Error ? error.message : 'Please try again',
                  variant: 'destructive',
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });
      setIsReportDialogOpen(false);
      setReportReason('');
    } catch (error) {
      toast({
        title: 'Failed to report post',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHidePost = async () => {
    try {
      await hidePost(post.id);
      toast({
        title: 'Post hidden',
        description: 'Hidden from your feed.',
        action: (
          <ToastAction
            altText="Undo hide post"
            className="h-9 min-w-[68px] px-3.5 text-sm sm:h-8 sm:min-w-0 sm:px-3"
            onClick={async () => {
              try {
                await unhidePost(post.id);
                onPostUpdated?.();
                toast({
                  title: 'Post unhidden',
                  description: 'Visible in feed again.',
                });
              } catch (error) {
                toast({
                  title: 'Undo failed',
                  description: error instanceof Error ? error.message : 'Please try again',
                  variant: 'destructive',
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });
      onPostUpdated?.();
    } catch (error) {
      toast({
        title: 'Failed to hide post',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleEditPost = async () => {
    if (!canEditOwnContent) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot edit posts.',
        variant: 'destructive',
      });
      return;
    }
    if (!editContent.trim()) {
      toast({
        title: 'Content required',
        description: 'Post content cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePost(post.id, { content: editContent });
      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully',
      });
      setIsEditDialogOpen(false);
      await invalidatePostQueries();
      onPostUpdated?.();
    } catch (error) {
      toast({
        title: 'Failed to update post',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!canDeleteOwnContent) {
      toast({
        title: 'Action not allowed',
        description: 'Your role cannot delete posts.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await deletePost(post.id);
      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      await invalidatePostQueries();
      onPostUpdated?.();
    } catch (error) {
      toast({
        title: 'Failed to delete post',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = shortRelativeTime(post.created_at);

  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover={!isMobile ? 'hover' : undefined}
      whileTap={isMobile ? 'tap' : undefined}
    >
    <Card 
      className={`home-card-tier2 p-3 md:p-5 space-y-3 ${isMobile ? 'cursor-pointer active:bg-white/5 transition-colors' : ''}`}
      onClick={handleCardBodyClick}
    >
      {/* Post Header */}
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar 
            className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAuthorClick}
            data-interactive="true"
          >
            <AvatarImage src={post.user?.avatar_url || undefined} />
            <AvatarFallback>
              {post.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 flex flex-col leading-tight">
            <div className="min-w-0">
              <h3 
                className="home-card-title font-semibold text-sm md:text-base text-white truncate cursor-pointer hover:underline transition-colors"
                onClick={handleAuthorClick}
                data-interactive="true"
              >
                {post.user?.full_name || 'Unknown User'}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40 min-w-0">
              {post.user?.role && (
                <UserBadge userType={post.user.role} size="sm" className="shrink-0 self-center" />
              )}
              {post.user?.role && post.user?.college_domain && (
                <span className="text-white/20 shrink-0 leading-none">&bull;</span>
              )}
              {post.user?.college_domain && (
                <span className="truncate min-w-0 leading-none">{post.user.college_domain}</span>
              )}
              {(post.user?.role || post.user?.college_domain) && (
                <span className="text-white/20 shrink-0 leading-none">&bull;</span>
              )}
              <button
                type="button"
                className="text-xs text-white/40 cursor-pointer hover:underline hover:text-white/60 transition-colors shrink-0"
                onClick={handleTimestampClick}
                data-interactive="true"
              >
                {timeAgo}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 self-start">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="touch-target flex-shrink-0 -mr-2 -my-1 h-7 w-7 p-0">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-xl border border-zinc-200 bg-white p-1 text-zinc-900 shadow-lg"
            >
              {isOwnPost && (canEditOwnContent || canDeleteOwnContent) && (
                <>
                  {canEditOwnContent && (
                    <DropdownMenuItem onClick={() => {
                      setEditContent(post.content);
                      setIsEditDialogOpen(true);
                    }} className="h-10 rounded-lg px-3 text-sm font-medium text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                      <Edit className="h-4 w-4 mr-2 text-zinc-900" />
                      Edit post
                    </DropdownMenuItem>
                  )}
                  {canDeleteOwnContent && (
                    <DropdownMenuItem 
                      onClick={() => setIsDeleteDialogOpen(true)} 
                      className="h-10 rounded-lg px-3 text-sm font-medium text-zinc-500 focus:bg-zinc-100 focus:text-zinc-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-zinc-500" />
                      Delete post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSavePost} disabled={isSaving} className="h-10 rounded-lg px-3 text-sm font-medium text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                <Bookmark className={`h-4 w-4 mr-2 text-zinc-900 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Unsave post' : 'Save post'}
              </DropdownMenuItem>
              {!isOwnPost && (
                <>
                  <DropdownMenuItem onClick={handleHidePost} className="h-10 rounded-lg px-3 text-sm font-medium text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                    <EyeOff className="h-4 w-4 mr-2 text-zinc-900" />
                    Hide post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)} disabled={!canReportContent} className="h-10 rounded-lg px-3 text-sm font-medium text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900">
                    <Flag className="h-4 w-4 mr-2 text-zinc-900" />
                    Report post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-2 md:space-y-3">
        <p className="home-body-text whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed text-white/90">{post.content}</p>
        
        {post.images && post.images.length > 0 && (
          <div className={`grid gap-2 ${
            post.images.length === 1 
              ? 'grid-cols-1' 
              : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {post.images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Post image ${index + 1}`}
                className="rounded-lg w-full object-contain max-h-[500px] bg-black/20 cursor-pointer transition-opacity hover:opacity-90"
                loading="lazy"
                decoding="async"
                onClick={() => setLightboxImage(img)}
              />
            ))}
          </div>
        )}

        {/* Image Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-black/60 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-2 [&>button]:right-2">
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Full size post image"
                className="w-auto h-auto max-w-full max-h-[90vh] mx-auto rounded-lg object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
        
        {post.video && (
          ReactPlayer.canPlay(post.video) ? (
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
              <ReactPlayer
                src={post.video}
                width="100%"
                height="100%"
                controls
                light
                style={{ position: 'absolute', top: 0, left: 0 }}
                config={{
                  youtube: { rel: 0 },
                }}
              />
            </div>
          ) : (
            <video
              src={post.video}
              controls
              className="rounded-lg w-full max-h-[400px] md:max-h-[500px]"
              preload="metadata"
            />
          )
        )}

        {post.documents && post.documents.length > 0 && (
          <div className="space-y-2">
            {post.documents.map((doc, index) => {
              const fileName = decodeURIComponent(doc.split('/').pop() || 'Document');
              // Strip timestamp prefix from filename for display
              const displayName = fileName.replace(/^\d+-[a-z0-9]+\./, '') || fileName;
              return (
                <a
                  key={index}
                  href={doc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                  data-interactive="true"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="h-8 w-8 text-white/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{displayName}</p>
                    <p className="text-xs text-white/40">Document</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}
        
        {activePoll && (
          <div className="border border-white/10 rounded-lg p-4 space-y-2">
            <p className="font-medium text-white">{activePoll.question}</p>
            {activePoll.options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between border-white/10 text-white hover:bg-white/6"
                onClick={() => handleVoteOnPoll(index)}
                disabled={pollVoting !== null || userHasVoted || isPollClosed}
              >
                <span>{option.text}</span>
                <span className="text-sm text-white/45">{option.votes} votes</span>
              </Button>
            ))}
            <p className="text-xs text-white/45">
              {isPollClosed
                ? "Poll ended"
                : `Poll ends ${new Date(activePoll.endDate).toLocaleDateString()}`}
            </p>
            {userHasVoted && (
              <p className="text-xs text-white/50">Thanks for voting.</p>
            )}
          </div>
        )}
      </div>

      {/* View count indicator */}
      {post.views_count != null && post.views_count > 0 && (
        <div className="flex items-center gap-1 text-xs text-white/30">
          <Eye className="h-3 w-3" />
          <span>{Number(post.views_count).toLocaleString()} views</span>
        </div>
      )}

      {/* Post Stats - LinkedIn-style with top reactions */}
      <div className="flex items-center justify-between text-sm text-white/45 border-t border-white/10 pt-3">
        <div className="flex items-center gap-1">
          {/* Top reactions display */}
          {totalReactions > 0 && (
            <ReactionDisplay 
              topReactions={topReactions} 
              totalReactions={totalReactions}
            />
          )}
          {totalReactions === 0 && <span>Be the first to react</span>}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowInlineComments(prev => !prev)}
            className="hover:text-white/70 hover:underline transition-colors"
          >
            {post.comments_count} comments
          </button>
          <span>{(post.reposts_count || 0) + (post.shares_count || 0)} reposts</span>
        </div>
      </div>

      {/* Post Actions - LinkedIn-style layout with micro-interactions */}
      <div className="flex items-center justify-between gap-1 md:gap-2 mt-4 pt-3 border-t border-white/10">
        {/* Reaction Picker */}
        <ReactionPicker
          postId={post.id}
          userReaction={userReaction}
          topReactions={topReactions}
          totalReactions={totalReactions}
          onReact={handleReaction}
          disabled={isReacting || !canLikePosts}
          className="flex-1"
        />
        
        {/* Comment Button — micro press */}
        <motion.div className="flex-1" variants={iconPress} whileHover="hover" whileTap="tap">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full touch-target text-xs md:text-sm hover:bg-white/[0.06] hover:text-white/80 transition-all duration-200"
            onClick={() => {
              if (!canCommentOnPosts) {
                toast({
                  title: 'Action not allowed',
                  description: 'Your role cannot add comments.',
                  variant: 'destructive',
                });
                return;
              }
              setShowInlineComments(true);
            }}
            disabled={!canCommentOnPosts}
          >
            <MessageSquare className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Comment</span>
          </Button>
        </motion.div>
        
        {/* Repost Button — micro press */}
        <motion.div className="flex-1" variants={iconPress} whileHover="hover" whileTap="tap">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`w-full touch-target text-xs md:text-sm hover:bg-white/[0.06] hover:text-white/80 transition-all duration-200 ${isReposted ? 'text-white/70' : ''}`}
            onClick={() => {
              if (!canSharePosts) {
                toast({
                  title: 'Action not allowed',
                  description: 'Your role cannot repost.',
                  variant: 'destructive',
                });
                return;
              }
              setIsRepostModalOpen(true);
            }}
            disabled={!canSharePosts}
          >
            <Repeat2 className={`h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 ${isReposted ? 'text-white/70' : ''}`} />
            <span className="hidden sm:inline">{isReposted ? 'Reposted' : 'Repost'}</span>
          </Button>
        </motion.div>

        {/* Bookmark Button — flip animation */}
        <motion.div
          className="flex-1"
          whileTap={{ rotateY: 180, scale: 1.15 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={`w-full touch-target text-xs md:text-sm hover:bg-white/[0.06] transition-all duration-200 ${isSaved ? 'text-white/70' : ''}`}
            onClick={handleSavePost}
            disabled={isSaving}
          >
            <Bookmark className={`h-4 w-4 md:h-5 md:w-5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
        </motion.div>
      </div>

      {/* Inline Comments Section — LinkedIn-style, fully inline */}
      <AnimatePresence>
      {showInlineComments && (
        <motion.div
          variants={expandVariants}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
        >
          <CommentSection
            postId={post.id}
            commentsCount={post.comments_count}
            disabled={!canCommentOnPosts}
            autoFocus
          />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Repost Modal - LinkedIn-style */}
      <RepostModal
        isOpen={isRepostModalOpen}
        onClose={() => setIsRepostModalOpen(false)}
        post={post}
        onReposted={() => {
          const updateRepostInCache = (old: any) => {
            if (!old) return old;
            if (old.pages) {
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: any) => 
                    p.id === post.id 
                      ? { ...p, reposted: true, reposts_count: (p.reposts_count || 0) + 1 }
                      : p
                  ),
                })),
              };
            }
            return old;
          };

          queryClient.setQueriesData(
            { predicate: (q) => q.queryKey.includes('home-feed') || q.queryKey.includes('feed-posts') },
            updateRepostInCache
          );
          onPostUpdated?.();
        }}
      />

      {/* Share Modal (legacy - for DM sharing) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={post.id}
        postContent={post.content}
        onShared={() => {
          const updateShareInCache = (old: any) => {
            if (!old) return old;
            if (old.pages) {
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  posts: page.posts?.map((p: any) =>
                    p.id === post.id
                      ? { ...p, shares_count: (p.shares_count || 0) + 1 }
                      : p
                  ),
                })),
              };
            }
            return old;
          };

          queryClient.setQueriesData(
            { predicate: (q) => q.queryKey.includes('home-feed') || q.queryKey.includes('feed-posts') },
            updateShareInCache
          );
          onPostUpdated?.();
        }}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                placeholder="What's on your mind?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPost}
              disabled={isSubmitting || !editContent.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={isSubmitting}
              className="bg-white/[0.10] text-white/80 hover:bg-white/[0.15] border-none"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-reason">Reason</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                placeholder="Please describe why you're reporting this post..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReportDialogOpen(false);
                setReportReason('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReportPost}
              disabled={isSubmitting || !reportReason.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </motion.div>
  );
}
