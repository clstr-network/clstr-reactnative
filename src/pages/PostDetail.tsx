import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPostById, getPostByIdPublic } from "@/lib/social-api";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState } from "@/components/ui/error-state";
import { PostSkeleton } from "@/components/ui/skeleton-loader";
import { PostCard } from "@/components/home/PostCard";
import { PublicPostCard } from "@/components/home/PublicPostCard";
import { isValidUuid } from "@/lib/uuid";

const PostDetail = () => {
  const { id } = useParams();
  const postId = id ?? "";
  const { profile, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "unauthenticated" | "offline"
  >("checking");
  const isValidPostId = Boolean(postId) && isValidUuid(postId);

  // Check auth state
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthStatus("offline");
        return;
      }

      setAuthStatus(data.session ? "authenticated" : "unauthenticated");
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setAuthStatus("unauthenticated");
      } else if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        setAuthStatus("authenticated");
      } else if (event === "INITIAL_SESSION" && !session) {
        setAuthStatus("unauthenticated");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = authStatus === "authenticated";

  const queryKey = useMemo(
    () => ["post-detail", postId, authStatus] as const,
    [postId, authStatus]
  );

  // Fetch post - use public API for unauthenticated users, private for authenticated
  const { data: post, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isAuthenticated && profile) {
        // Authenticated user - try to get full post with liked/saved state
        try {
          return await getPostById(postId);
        } catch (err) {
          // If user can't access (different college domain), fall back to public view
          console.warn("Falling back to public post view:", err);
          return await getPostByIdPublic(postId);
        }
      }
      // Unauthenticated - use public API
      return await getPostByIdPublic(postId);
    },
    enabled:
      isValidPostId &&
      authStatus !== "checking" &&
      (authStatus !== "authenticated" || !isProfileLoading),
    staleTime: 1000 * 30,
    retry: 1,
  });

  // Realtime subscriptions (only for authenticated users)
  useEffect(() => {
    if (!postId || !isAuthenticated) return;

    let channel = supabase
      .channel(`post-detail-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        () => queryClient.invalidateQueries({ queryKey: ["post-comments", postId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_shares", filter: `original_post_id=eq.${postId}` },
        () => queryClient.invalidateQueries({ queryKey })
      );

    if (profile?.id) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "saved_items",
          filter: `user_id=eq.${profile.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey })
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, profile?.id, queryClient, queryKey, isAuthenticated]);

  // Scroll to a specific comment if the URL contains a hash (e.g. #comment-uuid)
  useEffect(() => {
    if (!location.hash || isLoading) return;
    // Small delay to let comments render
    const timer = setTimeout(() => {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
    return () => clearTimeout(timer);
  }, [location.hash, isLoading]);

  // Handler for when user tries to interact without auth
  const handleAuthRequired = () => {
    // Store return URL and redirect to login
    const returnUrl = window.location.pathname;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  if (!postId || !isValidPostId) {
    return (
      <div className="home-theme bg-black min-h-screen text-white">
        <div className="container max-w-3xl py-8">
          <ErrorState
            title="Post unavailable"
            message="Missing or invalid post id."
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  if (isLoading || authStatus === "checking") {
    return (
      <div className="home-theme bg-black min-h-screen text-white">
        <div className="container max-w-3xl py-8 space-y-4">
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="home-theme bg-black min-h-screen text-white">
        <div className="container max-w-3xl py-8">
          <ErrorState
            title="Unable to load post"
            message={error instanceof Error ? error.message : "Failed to load post."}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  // Render public view for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="home-theme bg-black min-h-screen text-white">
        <div className="container max-w-3xl py-8">
          <PublicPostCard
            post={post}
            onAuthRequired={handleAuthRequired}
          />
        </div>
      </div>
    );
  }

  // Render full interactive view for authenticated users
  // Auto-show comments on post detail page (LinkedIn behavior)
  return (
    <div className="home-theme bg-black min-h-screen text-white">
      <div className="container max-w-3xl py-8">
        <PostCard
          post={post}
          onPostUpdated={() => queryClient.invalidateQueries({ queryKey })}
          autoShowComments={true}
        />
      </div>
    </div>
  );
};

export default PostDetail;
