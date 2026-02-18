import { useState } from "react";
import { Repeat2, Edit3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createRepost, Post } from "@/lib/social-api";
import { useProfile } from "@/contexts/ProfileContext";

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onReposted?: () => void;
}

export function RepostModal({ isOpen, onClose, post, onReposted }: RepostModalProps) {
  const [mode, setMode] = useState<'select' | 'with-thoughts'>('select');
  const [commentary, setCommentary] = useState('');
  const [isReposting, setIsReposting] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const handleQuickRepost = async () => {
    setIsReposting(true);
    try {
      await createRepost(post.id);
      toast({
        title: 'Post reposted',
        description: 'Your repost is now visible to your network',
      });
      onReposted?.();
      handleClose();
    } catch (error) {
      toast({
        title: 'Failed to repost',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsReposting(false);
    }
  };

  const handleRepostWithThoughts = async () => {
    setIsReposting(true);
    try {
      await createRepost(post.id, commentary);
      toast({
        title: 'Post reposted with your thoughts',
        description: 'Your repost is now visible to your network',
      });
      onReposted?.();
      handleClose();
    } catch (error) {
      toast({
        title: 'Failed to repost',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsReposting(false);
    }
  };

  const handleClose = () => {
    setMode('select');
    setCommentary('');
    onClose();
  };

  // Truncate post content for preview
  const truncatedContent = post.content.length > 150 
    ? post.content.substring(0, 150) + "..." 
    : post.content;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="home-theme w-[95vw] max-w-lg sm:max-w-xl mx-auto p-4 sm:p-6 bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Repeat2 className="h-5 w-5" />
            Share Post
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-1">
            {mode === 'select' 
              ? "Choose how you'd like to share this post"
              : "Add your thoughts to this repost"
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'select' ? (
          <div className="space-y-4">
            {/* Quick Repost Option */}
            <button
              onClick={handleQuickRepost}
              disabled={isReposting}
              className="w-full p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white/[0.06] group-hover:bg-white/10">
                  <Repeat2 className="h-5 w-5 text-white/50 group-hover:text-white" />
                </div>
                <div>
                  <p className="font-medium">Repost</p>
                  <p className="text-sm text-white/50">Instantly share to your network</p>
                </div>
              </div>
            </button>

            {/* Repost with Thoughts Option */}
            <button
              onClick={() => setMode('with-thoughts')}
              disabled={isReposting}
              className="w-full p-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-white/[0.06] group-hover:bg-white/10">
                  <Edit3 className="h-5 w-5 text-white/50 group-hover:text-white" />
                </div>
                <div>
                  <p className="font-medium">Repost with your thoughts</p>
                  <p className="text-sm text-white/50">Add commentary before sharing</p>
                </div>
              </div>
            </button>

            {/* Original Post Preview */}
            <Card className="home-card-tier2 rounded-xl p-3 shadow-none hover:shadow-none">
              <div className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {post.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {post.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-white/50 mt-1 line-clamp-2">
                    {truncatedContent}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Commentary Input */}
            <div className="flex gap-2">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <Textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="What are your thoughts?"
                className="min-h-[100px] resize-none"
                autoFocus
              />
            </div>

            {/* Original Post Preview */}
            <Card className="home-card-tier2 rounded-xl p-3 shadow-none hover:shadow-none">
              <div className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {post.user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {post.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-white/50 mt-1 line-clamp-3">
                    {post.content}
                  </p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMode('select')}
                disabled={isReposting}
              >
                Back
              </Button>
              <Button
                onClick={handleRepostWithThoughts}
                disabled={isReposting}
                className="bg-white/15 hover:bg-white/20 text-white border border-white/15"
              >
                {isReposting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
