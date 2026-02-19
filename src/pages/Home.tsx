import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { ChevronDown, Loader2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileSummary from "@/components/home/ProfileSummary";
import QuickNavigation from "@/components/home/QuickNavigation";
import TrendingConnections from "@/components/home/TrendingAlumni";
import TrendingTopics from "@/components/home/TrendingTopics";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import PostComposer, { type ComposerAttachment } from "@/components/home/PostComposer";
import { PostCard } from "@/components/home/PostCard";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "@/components/ui/use-toast";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { PersonalEmailPrompt } from "@/components/profile/PersonalEmailPrompt";
import { ErrorState } from "@/components/ui/error-state";
import { PostSkeleton } from "@/components/ui/skeleton-loader";
import { feedItemVariants, feedContainerVariants } from "@/lib/animations";
import {
  createPost,
  getPosts,
} from "@/lib/social-api";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { useRolePermissions } from "@/hooks/useRolePermissions";

type CreatePostPayload = {
  content: string;
  attachment?: ComposerAttachment;
};

type SortOrder = "recent" | "top";

const FEED_QUERY_KEY = ["home-feed"] as const;
const PERSONAL_EMAIL_PROMPT_VISIT_INTERVAL = 10;

const Home = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { canPostInFeed } = useRolePermissions();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // UI state for modals and interactions
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [shouldShowPersonalEmailPrompt, setShouldShowPersonalEmailPrompt] = useState(false);

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) {
      setShouldShowPersonalEmailPrompt(false);
      return;
    }

    const hasLinkedPersonalEmail =
      profile.personal_email_verified === true ||
      profile.email_transition_status === "verified" ||
      profile.email_transition_status === "transitioned";

    if (hasLinkedPersonalEmail) {
      setShouldShowPersonalEmailPrompt(false);
      return;
    }

    const storageKey = `home-personal-email-visit-count:${userId}`;
    const currentRaw = window.localStorage.getItem(storageKey);
    const currentCount = Number.parseInt(currentRaw ?? "0", 10);
    const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;

    window.localStorage.setItem(storageKey, String(nextCount));
    setShouldShowPersonalEmailPrompt(nextCount % PERSONAL_EMAIL_PROMPT_VISIT_INTERVAL === 0);
  }, [
    profile?.id,
    profile?.personal_email_verified,
    profile?.email_transition_status,
  ]);

  const invalidatePostQueries = useMemo(
    () => async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key.includes("home-feed") || key.includes("feed-posts") || key.includes("profile-posts") || key.includes("saved-items") || key.includes("post-detail");
        },
      });
    },
    [queryClient]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [...FEED_QUERY_KEY, sortOrder],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getPosts({ cursor: pageParam, pageSize: 6, sortBy: sortOrder }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 1000 * 30,
    // Only enable query when profile is loaded to prevent errors during auth
    enabled: Boolean(profile?.id) && !isProfileLoading,
    retry: 1, // Only retry once to avoid infinite loops
  });

  const feedPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  useDocumentTitle("clstr | Home");

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    if (!hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, feedPosts.length]);

  useEffect(() => {
    if (!profile?.id) return;

    const queryKey = [...FEED_QUERY_KEY, sortOrder];

    const channel = supabase
      .channel(CHANNELS.feed.homeFeedUser(profile.id))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => {
          // Only invalidate comment-specific caches Ã¢â‚¬â€ NOT the entire feed.
          // The feed's comments_count is stale until the next fetch, but this
          // avoids expensive full-feed re-renders on every comment.
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.postComments() });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.topComments() });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed.postComments() })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reposts" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_shares" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_items",
          filter: `user_id=eq.${profile.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, sortOrder]);

  const handleCreatePost = async ({ content, attachment }: CreatePostPayload) => {
    try {
      if (!canPostInFeed) {
        toast({
          title: "Action not allowed",
          description: "Your role cannot create posts.",
          variant: "destructive",
        });
        return;
      }
      await createPost({
        content,
        attachment: attachment
          ? {
            type: attachment.type,
            file: attachment.file,
            url: attachment.src,
          }
          : undefined,
      });

      toast({
        title: "Post created",
        description: "Your update is now live in the feed.",
      });

      await queryClient.invalidateQueries({ queryKey: [...FEED_QUERY_KEY, sortOrder] });
    } catch (err) {
      console.error("Failed to create post", err);
    }
  };

  const handlePostUpdated = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [...FEED_QUERY_KEY, sortOrder] });
    await invalidatePostQueries();
  }, [invalidatePostQueries, queryClient, sortOrder]);

  // ============ SORT HANDLER ============
  const handleSortChange = (newSort: SortOrder) => {
    if (newSort !== sortOrder) {
      setSortOrder(newSort);
      // Query will automatically refetch due to queryKey change
    }
  };

  return (
    <div className="home-theme bg-[#000000] text-white">
      <div className="container mx-auto px-3 md:px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">

          {/* LEFT SIDEBAR */}
          <aside className="hidden md:block md:col-span-3 home-sidebar">
            <div className="pt-4 pb-4 md:pb-6">
              <div className="space-y-5">
                <ProfileSummary />
                <QuickNavigation />
              </div>
            </div>
          </aside>

          {/* MAIN FEED */}
          <div className="md:col-span-6">
            <div className="space-y-5 pt-4 pb-20 md:pb-10">
            {/* Profile completion banner Ã¢â‚¬â€ Tier 1 */}
            <ProfileCompletionBanner />

            {/* Personal email prompt Ã¢â‚¬â€ shown to students nearing graduation */}
            {shouldShowPersonalEmailPrompt && <PersonalEmailPrompt forceShow />}

            {/* Post Composer Ã¢â‚¬â€ Tier 1 (visual anchor) */}
            <PostComposer profile={profile} onCreate={handleCreatePost} />

            <div className="flex justify-end items-center text-sm text-white/50">
              <span className="mr-2">Sort by:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center hover:bg-white/[0.06]">
                    <span className="font-medium">{sortOrder === "top" ? "Top" : "Recent"}</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortChange("recent")}>
                    Recent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("top")}>
                    Top
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Loading skeletons with exit animation */}
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  className="space-y-4"
                  key="feed-skeleton"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                >
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </motion.div>
              )}
            </AnimatePresence>

            {isError && error instanceof Error && (
              <ErrorState
                title="Unable to load feed"
                message={error.message}
                onRetry={refetch}
              />
            )}

            {!isLoading && !isError && feedPosts.length === 0 && (
              <motion.div
                className="home-card-tier2 p-6 text-center text-sm text-white/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                No posts yet. Be the first to share something with your college network.
              </motion.div>
            )}

            {/* Feed cards with staggered framer-motion entry */}
            <motion.div
              className="space-y-5"
              variants={feedContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {feedPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  variants={feedItemVariants}
                  custom={index}
                >
                  <PostCard post={post} onPostUpdated={handlePostUpdated} />
                </motion.div>
              ))}
            </motion.div>

            <div ref={loadMoreRef} />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 text-sm text-white/50">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading more posts...
              </div>
            )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden md:block md:col-span-3 home-sidebar">
            <div className="pt-4 pb-4 md:pb-6">
              <div className="space-y-5">
                <motion.div layout transition={{ duration: 0.15, ease: 'easeOut' }}>
                  <TrendingTopics />
                </motion.div>
                <motion.div layout transition={{ duration: 0.15, ease: 'easeOut' }}>
                  <UpcomingEvents />
                </motion.div>
                <motion.div layout transition={{ duration: 0.15, ease: 'easeOut' }}>
                  <TrendingConnections />
                </motion.div>
              </div>
            </div>
          </aside>
        </div>
      </div>

    </div>
  );
}

export default Home;
