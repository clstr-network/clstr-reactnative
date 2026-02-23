/**
 * useNetwork — Network connectivity hook (mobile port).
 *
 * Uses @react-native-community/netinfo instead of web's @uidotdev/usehooks.
 * Provides online/offline status and connection type information.
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string | null;
  isWifi: boolean;
  isCellular: boolean;
  details: NetInfoState | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetInfoState | null>(null);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isConnected = netState.isConnected ?? true;

      // Show alert when going offline
      if (!isConnected && !wasOffline) {
        Alert.alert(
          "You're offline",
          'Some features may not work. Check your internet connection.',
        );
        setWasOffline(true);
      } else if (isConnected && wasOffline) {
        setWasOffline(false);
      }

      setState(netState);
    });

    return () => unsubscribe();
  }, [wasOffline]);

  return {
    isOnline: state?.isConnected ?? true,
    connectionType: state?.type ?? null,
    isWifi: state?.type === 'wifi',
    isCellular: state?.type === 'cellular',
    details: state,
  };
}

export default useNetworkStatus;
