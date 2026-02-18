import { TrendingUp } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { TrendingTopic } from '@/lib/trending-api';

interface TrendingTopicCardProps {
  topic: TrendingTopic;
  onClick: () => void;
}

const TrendingTopicCard = ({ topic, onClick }: TrendingTopicCardProps) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div
          onClick={onClick}
          className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                  #{topic.tag}
                </p>
              </div>
              <p className="text-xs text-white/60">
                {Number(topic.postCount ?? 0).toLocaleString()} posts
              </p>
            </div>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="left" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">#{topic.tag}</h4>
            <span className="text-xs text-white/60">
              {Number(topic.postCount ?? 0).toLocaleString()} posts
            </span>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/60">Recent posts:</p>
            {topic.recentPosts.map((post) => (
              <div
                key={post.id}
                className="p-2 rounded-md bg-accent/50 hover:bg-accent transition-colors"
              >
                <p className="text-xs font-medium mb-1">{post.author}</p>
                <p className="text-xs text-white/60 line-clamp-2 mb-1">
                  {post.excerpt}
                </p>
                <p className="text-xs text-white/60">{post.timestamp}</p>
              </div>
            ))}
          </div>
          
          <button className="text-xs text-primary hover:underline font-medium">
            View all posts →
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default TrendingTopicCard;
