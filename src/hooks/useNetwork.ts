/**
 * Network state hook - Provides online/offline status and network information
 * Uses useNetworkState from @uidotdev/usehooks
 */
import { useNetworkState, useVisibilityChange } from '@uidotdev/usehooks';
import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

export function useNetworkStatus() {
  const network = useNetworkState();
  const isDocumentVisible = useVisibilityChange();

  // Show toast when connection status changes
  useEffect(() => {
    if (!isDocumentVisible) return;
    
    if (network.online === false) {
      toast({
        title: "You're offline",
        description: "Some features may not work. Check your internet connection.",
        variant: "destructive",
      });
    }
  }, [network.online, isDocumentVisible]);

  return {
    isOnline: network.online ?? true,
    effectiveType: network.effectiveType, // '4g', '3g', '2g', 'slow-2g'
    downlink: network.downlink, // Estimated bandwidth in Mbps
    rtt: network.rtt, // Round trip time in ms
    saveData: network.saveData, // Data saver mode enabled
  };
}

export default useNetworkStatus;
