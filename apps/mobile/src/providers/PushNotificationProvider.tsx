/**
 * PushNotificationProvider
 *
 * Wraps the app tree to initialize the push notification hook.
 * Exposes push state and requestPermission via React context so
 * any screen can trigger the permission prompt (e.g., after the
 * user's first message send, not on cold launch).
 */
import React, { createContext, useContext } from 'react';
import {
  usePushNotificationsMobile,
} from '../hooks/usePushNotificationsMobile';

interface PushContextValue {
  expoPushToken: string | null;
  permissionGranted: boolean;
  isRegistering: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  deactivateToken: () => Promise<void>;
}

const PushContext = createContext<PushContextValue>({
  expoPushToken: null,
  permissionGranted: false,
  isRegistering: false,
  error: null,
  requestPermission: async () => {},
  deactivateToken: async () => {},
});

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const push = usePushNotificationsMobile();

  return (
    <PushContext.Provider value={push}>
      {children}
    </PushContext.Provider>
  );
}

/** Use this in any screen to access push state or trigger permission */
export function usePushNotifications(): PushContextValue {
  return useContext(PushContext);
}
