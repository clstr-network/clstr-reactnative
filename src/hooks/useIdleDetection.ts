/**
 * Idle detection hook - Detects user inactivity
 * Uses useIdle from @uidotdev/usehooks
 */
import { useIdle } from '@uidotdev/usehooks';
import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseIdleDetectionOptions {
  /** Idle timeout in milliseconds (default: 15 minutes) */
  idleTimeout?: number;
  /** Whether to show warning toast when idle */
  showWarning?: boolean;
  /** Whether to update presence status in database */
  updatePresence?: boolean;
  /** User ID for presence updates */
  userId?: string;
}

export function useIdleDetection({
  idleTimeout = 15 * 60 * 1000, // 15 minutes
  showWarning = true,
  updatePresence = true,
  userId,
}: UseIdleDetectionOptions = {}) {
  const isIdle = useIdle(idleTimeout);

  useEffect(() => {
    if (isIdle && showWarning) {
      toast({
        title: "Are you still there?",
        description: "You've been inactive for a while.",
      });
    }
  }, [isIdle, showWarning]);

  // Update presence status in database
  useEffect(() => {
    if (!updatePresence || !userId) return;

    const updateStatus = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ 
            last_seen: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    };

    // Update when user becomes active again
    if (!isIdle) {
      updateStatus();
    }
  }, [isIdle, updatePresence, userId]);

  return { isIdle };
}

export default useIdleDetection;
