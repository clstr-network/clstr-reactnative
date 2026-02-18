import { useState, useRef, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ReactionType, 
  REACTION_EMOJI_MAP, 
  REACTION_LABELS,
  ReactionCount 
} from '@/lib/social-api';

interface ReactionPickerProps {
  postId: string;
  userReaction: ReactionType | null;
  topReactions?: ReactionCount[];
  totalReactions: number;
  onReact: (reactionType: ReactionType) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const REACTION_TYPES: ReactionType[] = [
  'like', 'celebrate', 'support', 'love', 'insightful', 'curious', 'laugh'
];

export function ReactionPicker({
  postId,
  userReaction,
  topReactions = [],
  totalReactions,
  onReact,
  disabled = false,
  className,
}: ReactionPickerProps) {
  const [showTray, setShowTray] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tray when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTray(false);
      }
    };

    if (showTray) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTray]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleQuickReact = async () => {
    if (disabled || isReacting) return;
    
    // Quick tap = Like
    setIsReacting(true);
    try {
      await onReact('like');
    } finally {
      setIsReacting(false);
    }
  };

  const handleSelectReaction = async (reactionType: ReactionType) => {
    if (disabled || isReacting) return;
    
    setIsReacting(true);
    setShowTray(false);
    try {
      await onReact(reactionType);
    } finally {
      setIsReacting(false);
    }
  };

  // Desktop: hover to show tray
  const handleMouseEnter = () => {
    if (disabled) return;
    longPressTimer.current = setTimeout(() => {
      setShowTray(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Delay hiding to allow clicking on reactions
    setTimeout(() => {
      if (!containerRef.current?.matches(':hover')) {
        setShowTray(false);
      }
    }, 300);
  };

  // Mobile: long-press to show tray
  const handleTouchStart = () => {
    if (disabled) return;
    longPressTimer.current = setTimeout(() => {
      setShowTray(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Render reaction emoji for button
  const renderButtonContent = () => {
    if (userReaction) {
      return (
        <>
          <span className="text-lg mr-1">{REACTION_EMOJI_MAP[userReaction]}</span>
          <span className="hidden sm:inline text-sm font-medium">
            {REACTION_LABELS[userReaction]}
          </span>
        </>
      );
    }
    
    return (
      <>
        <ThumbsUp className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Like</span>
      </>
    );
  };

  // Get button color based on reaction
  const getButtonColor = () => {
    if (!userReaction) return '';
    
    switch (userReaction) {
      case 'like':
        return 'text-blue-600';
      case 'love':
        return 'text-red-500';
      case 'celebrate':
        return 'text-green-600';
      case 'support':
        return 'text-purple-600';
      case 'insightful':
        return 'text-yellow-600';
      case 'curious':
        return 'text-orange-500';
      case 'laugh':
        return 'text-amber-500';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Reaction Tray */}
      {showTray && (
        <div 
          className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          onMouseEnter={() => setShowTray(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-black/90 backdrop-blur-xl rounded-full shadow-lg border border-white/15 p-1.5 flex gap-0.5">
            {REACTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectReaction(type)}
                disabled={isReacting}
                className={cn(
                  "p-2 rounded-full transition-all duration-150 hover:scale-125 hover:bg-white/10",
                  "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-1 focus:ring-offset-black",
                  userReaction === type && "bg-white/15 scale-110"
                )}
                title={REACTION_LABELS[type]}
              >
                <span className="text-xl">{REACTION_EMOJI_MAP[type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1 touch-target text-xs md:text-sm",
          getButtonColor()
        )}
        onClick={handleQuickReact}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || isReacting}
      >
        {renderButtonContent()}
      </Button>
    </div>
  );
}

// Compact reaction display for post stats (e.g., "💡 24 • 🎉 12 • 68")
interface ReactionDisplayProps {
  topReactions: ReactionCount[];
  totalReactions: number;
  onClick?: () => void;
}

export function ReactionDisplay({ topReactions, totalReactions, onClick }: ReactionDisplayProps) {
  if (totalReactions === 0) {
    return null;
  }

  const top2 = topReactions.slice(0, 2);

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-white/45 hover:text-white/70 hover:underline transition-colors"
    >
      {top2.map((reaction, index) => (
        <span key={reaction.type} className="flex items-center">
          <span className="text-base">{REACTION_EMOJI_MAP[reaction.type]}</span>
          <span className="ml-0.5">{reaction.count}</span>
          {index < top2.length - 1 && <span className="mx-1">•</span>}
        </span>
      ))}
      {totalReactions > 0 && top2.length > 0 && (
        <>
          <span className="mx-1">•</span>
          <span>{totalReactions}</span>
        </>
      )}
      {top2.length === 0 && totalReactions > 0 && (
        <span>{totalReactions} reactions</span>
      )}
    </button>
  );
}
