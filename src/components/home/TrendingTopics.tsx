import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TrendingTopicCard from './TrendingTopicCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getTrendingTopics,
  subscribeTrendingTopics,
  trendingTopicsKeys,
  type TrendingTopic,
} from '@/lib/trending-api';

/**
 * TrendingTopics Component
 * 
 * Displays trending hashtags from the user's college domain,
 * fetched from Supabase with realtime updates.
 */
const TrendingTopics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trending topics with React Query
  const {
    data: topics = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: trendingTopicsKeys.list({ limit: 5 }),
    queryFn: () => getTrendingTopics({ limit: 5 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Invalidate query callback for realtime
  const handleRealtimeUpdate = useCallback(() => {
    // Debounce-style: only invalidate if not already refetching
    queryClient.invalidateQueries({ queryKey: trendingTopicsKeys.all });
  }, [queryClient]);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeTrendingTopics(handleRealtimeUpdate);
    return () => {
      unsubscribe();
    };
  }, [handleRealtimeUpdate]);

  const handleTopicClick = (tag: string) => {
    toast({
      title: 'Search moved to the top bar',
      description: `Tag search is retired. Use the header search to find people or events instead of #${tag}.`,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="alumni-card p-4 md:p-6">
        <h3 className="home-section-title font-medium text-sm text-white uppercase tracking-wide mb-4">Trending Now</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="alumni-card p-4 md:p-6">
        <h3 className="home-section-title font-medium text-sm text-white uppercase tracking-wide mb-4">Trending Now</h3>
        <div className="flex items-center gap-2 text-white/45 text-sm p-3">
          <AlertCircle className="h-4 w-4" />
          <span>Unable to load trending topics</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (topics.length === 0) {
    return (
      <div className="alumni-card p-4 md:p-6">
        <h3 className="home-section-title font-medium text-sm text-white uppercase tracking-wide mb-4">Trending Now</h3>
        <div className="flex flex-col items-center justify-center py-6 text-white/40">
          <TrendingUp className="h-8 w-8 mb-2 text-blue-500/50" />
          <p className="text-sm text-center">
            No trending topics yet.
            <br />
            Start a conversation with #hashtags!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="alumni-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="home-section-title font-medium text-sm text-white uppercase tracking-wide">Trending Now</h3>
        <TrendingUp className="h-4 w-4 text-blue-500" />
      </div>
      <div className="space-y-3">
        {topics.map((topic: TrendingTopic) => (
          <TrendingTopicCard
            key={topic.id}
            topic={topic}
            onClick={() => handleTopicClick(topic.tag)}
          />
        ))}
      </div>
    </div>
  );
};

export default TrendingTopics;
