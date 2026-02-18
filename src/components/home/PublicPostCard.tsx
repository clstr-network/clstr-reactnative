import { useState, useCallback } from 'react';
import { ThumbsUp, MessageSquare, Share2, Copy, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/lib/social-api';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { useToast } from '@/hooks/use-toast';
import { UserBadge } from '@/components/ui/user-badge';

interface PublicPostCardProps {
  post: Post;
  onAuthRequired: () => void;
}

/**
 * PublicPostCard - Read-only view for unauthenticated users
 * 
 * What they CAN see:
 * ✅ Post content
 * ✅ Author name & avatar
 * ✅ Media (image/video/doc)
 * ✅ Timestamp
 * ✅ Copy link
 * 
 * What they CANNOT do (redirects to login):
 * ❌ Like
 * ❌ Comment
 * ❌ Share to people
 * ❌ Save
 * ❌ View profiles (requires auth)
 */
export function PublicPostCard({ post, onAuthRequired }: PublicPostCardProps) {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/post/${post.id}`;
  const copied = copiedText === shareUrl;

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
  };

  // Author click requires auth (profiles are not public)
  const handleAuthorClick = useCallback(() => {
    onAuthRequired();
  }, [onAuthRequired]);

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <Card className="home-card-tier2 p-4 md:p-6 space-y-4">
      {/* Post Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2 md:gap-3 flex-1 min-w-0">
          <Avatar 
            className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAuthorClick}
          >
            <AvatarImage src={post.user?.avatar_url || undefined} />
            <AvatarFallback>
              {post.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 
              className="font-semibold text-sm md:text-base text-white truncate cursor-pointer hover:underline transition-colors"
              onClick={handleAuthorClick}
            >
              {post.user?.full_name || 'Unknown User'}
            </h3>
            {post.user?.role && (
              <div>
                <UserBadge userType={post.user.role} size="sm" />
              </div>
            )}
            {post.user?.college_domain && (
              <p className="text-xs text-white/40">{post.user.college_domain}</p>
            )}
            <p className="text-xs text-white/40">{timeAgo}</p>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-2 md:space-y-3">
        <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-white/90">{post.content}</p>
        
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
                className="rounded-lg w-full object-cover max-h-[500px]"
                loading="lazy"
              />
            ))}
          </div>
        )}
        
        {post.video && (
          <video
            src={post.video}
            controls
            className="rounded-lg w-full max-h-[400px] md:max-h-[500px]"
            preload="metadata"
          />
        )}
        
        {post.poll && (
          <div className="border border-white/10 rounded-lg p-4 space-y-2">
            <p className="font-medium text-white">{post.poll.question}</p>
            {post.poll.options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between border-white/10 text-white/60 cursor-not-allowed"
                disabled
              >
                <span>{option.text}</span>
                <span className="text-sm text-white/40">{option.votes} votes</span>
              </Button>
            ))}
            <p className="text-xs text-white/40 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Sign in to vote
            </p>
          </div>
        )}
      </div>

      {/* Post Stats */}
      <div className="flex items-center gap-4 text-sm text-white/40 border-t border-white/10 pt-3">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
        <span>{post.shares_count} shares</span>
      </div>

      {/* Auth Wall Message */}
      <div className="bg-white/[0.04] rounded-lg p-4 text-center border border-white/10">
        <Lock className="h-5 w-5 mx-auto mb-2 text-white/40" />
        <p className="text-sm text-white/40 mb-3">
          Sign in to like, comment, or share this post
        </p>
        <Button onClick={onAuthRequired} size="sm" className="bg-white/[0.06] hover:bg-white/10 text-white border border-white/10">
          Sign in to interact
        </Button>
      </div>

      {/* Post Actions - Limited for public view */}
      <div className="flex items-center gap-1 md:gap-2 border-t border-white/10 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 touch-target text-xs md:text-sm opacity-50"
          onClick={onAuthRequired}
        >
          <ThumbsUp className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Like</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 touch-target text-xs md:text-sm opacity-50"
          onClick={onAuthRequired}
        >
          <MessageSquare className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Comment</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 touch-target text-xs md:text-sm opacity-50"
          onClick={onAuthRequired}
        >
          <Share2 className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Share</span>
        </Button>

        {/* Copy Link - Available to everyone */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 touch-target text-xs md:text-sm"
          onClick={handleCopyLink}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-green-600" />
              <span className="hidden sm:inline text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
