
import { useState, useEffect, useMemo } from "react";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { 
  Image, 
  Video, 
  FileText,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getPostsByUser, 
  createPost, 
  type GetPostsResponse, 
  type Post as ApiPost 
} from "@/lib/social-api";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/home/PostCard";
import { useRolePermissions } from "@/hooks/useRolePermissions";

interface ProfilePostsProps {
  profileId: string;
  isCurrentUser: boolean;
  preview?: boolean;
  maxPosts?: number;
  onPostsCountChange?: (count: number) => void;
}

const ProfilePosts = ({
  profileId,
  isCurrentUser,
  preview = false,
  maxPosts,
  onPostsCountChange,
}: ProfilePostsProps) => {
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isVideoInputOpen, setIsVideoInputOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const queryClient = useQueryClient();
  const { canPostInFeed } = useRolePermissions();

  const POSTS_QUERY_KEY = useMemo(() => ["profile-posts", profileId] as const, [profileId]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: POSTS_QUERY_KEY,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getPostsByUser(profileId, { cursor: pageParam, pageSize: 10 }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 1000 * 30,
    enabled: Boolean(profileId),
  });

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  
  // For preview mode, limit the number of posts displayed
  const displayedPosts = preview && maxPosts ? posts.slice(0, maxPosts) : posts;

  useEffect(() => {
    onPostsCountChange?.(posts.length);
  }, [onPostsCountChange, posts.length]);

  // Realtime subscription for posts
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(CHANNELS.profile.posts(profileId))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${profileId}` },
        () => queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, queryClient, POSTS_QUERY_KEY]);

  // Cleanup image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handlePostSubmit = async () => {
    if (!postContent.trim() && !selectedImage && !selectedDocument && !videoUrl.trim()) {
      toast({
        title: "Empty post",
        description: "Please add some content to your post.",
        variant: "destructive",
      });
      return;
    }

    if (!canPostInFeed) {
      toast({
        title: "Action not allowed",
        description: "Your role cannot create posts.",
        variant: "destructive",
      });
      return;
    }
    
    setIsPosting(true);
    try {
      const trimmedContent = postContent.trim();
      const resolvedContent = (() => {
        if (trimmedContent) return trimmedContent;
        if (selectedImage) return "Shared a photo";
        if (selectedDocument) return "Shared a document";
        if (videoUrl.trim()) return "Shared a video";
        return "";
      })();

      await createPost({
        content: resolvedContent,
        attachment: selectedImage
          ? {
              type: "image",
              file: selectedImage,
            }
          : selectedDocument
            ? {
                type: "document",
                file: selectedDocument,
              }
            : videoUrl.trim()
              ? {
                  type: "video",
                  url: videoUrl.trim(),
                }
              : undefined,
      });

      setPostContent("");
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedDocument(null);
      setVideoUrl("");
      setIsVideoInputOpen(false);
      
      // Invalidate and refetch posts
      await queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profileId) });
      
      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      });
    } catch (error) {
      console.error("Failed to create post:", error);
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 20MB.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setSelectedDocument(null);
    setVideoUrl("");
    setIsVideoInputOpen(false);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (file.type && !validTypes.includes(file.type)) {
      toast({
        title: "Unsupported document type",
        description: "Upload a PDF, Word, Excel, PowerPoint, or text file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Document too large",
        description: "Maximum size is 20MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedDocument(file);
    setSelectedImage(null);
    setImagePreview(null);
    setVideoUrl("");
    setIsVideoInputOpen(false);
  };

  const handleVideoSelect = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedDocument(null);
    setIsVideoInputOpen(true);
  };

  const clearVideo = () => {
    setVideoUrl("");
    setIsVideoInputOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Only show create post area in non-preview mode */}
      {!preview && isCurrentUser && (
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-4">
          <Textarea
            placeholder="Share something with your network..."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="resize-none bg-white/[0.04] border-white/10 text-white/70 placeholder:text-white/30 focus:border-white/20"
            rows={3}
            disabled={isPosting}
          />
          
          {imagePreview && (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Post attachment" 
                className="rounded-md w-full h-auto object-cover max-h-60" 
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 h-8 w-8"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                disabled={isPosting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isVideoInputOpen && (
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="Paste a video link (YouTube, Vimeo, etc.)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-white/70 placeholder:text-white/30 focus:border-white/20"
                disabled={isPosting}
              />
            </div>
          )}

          {selectedDocument && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{selectedDocument.name}</p>
                <p className="text-xs text-white/40">
                  {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 h-8 w-8"
                onClick={() => setSelectedDocument(null)}
                disabled={isPosting}
                aria-label="Remove document"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {videoUrl.trim().length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{videoUrl.trim()}</p>
                <p className="text-xs text-white/40">Video link</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 h-8 w-8"
                onClick={clearVideo}
                disabled={isPosting}
                aria-label="Remove video"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={isPosting}
                />
                <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/60 hover:bg-white/[0.06]" asChild disabled={isPosting}>
                  <span>
                    <Image className="h-4 w-4 mr-2" />
                    Photo
                  </span>
                </Button>
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/30 cursor-not-allowed"
                disabled
                title="Video posts coming soon (beta)"
              >
                <Video className="h-4 w-4 mr-2" />
                Video
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/30 cursor-not-allowed"
                disabled
                title="Document posts coming soon (beta)"
              >
                <FileText className="h-4 w-4 mr-2" />
                Document
              </Button>
            </div>
            <Button
              className="bg-white/[0.10] hover:bg-white/[0.15] text-white border border-white/10 w-full sm:w-auto"
              disabled={(!postContent.trim() && !selectedImage && !selectedDocument && !videoUrl.trim()) || isPosting}
              onClick={handlePostSubmit}
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/30" />
          <p className="text-white/40 mt-2">Loading posts...</p>
        </div>
      )}

      {isError && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/50 mb-2">Failed to load posts.</p>
          <Button 
            variant="outline" 
            className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            onClick={() => queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY })}
          >
            Try Again
          </Button>
        </div>
      )}

      {!isLoading && !isError && displayedPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPostUpdated={() => queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY })}
        />
      ))}

      {!isLoading && !isError && displayedPosts.length === 0 && (
        <div className={`${preview ? '' : 'bg-white/[0.04] border border-white/10 rounded-xl'} ${preview ? 'py-4' : 'p-8'} text-center`}>
          <p className="text-white/40 mb-2">No posts to display.</p>
          {!preview && isCurrentUser && (
            <p className="text-sm text-white/25">Share your first update with your network!</p>
          )}
        </div>
      )}

      {/* Only show "Load More" in non-preview mode */}
      {!preview && hasNextPage && (
        <div className="text-center">
          <Button 
            variant="outline" 
            className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProfilePosts;
