/**
 * usePushNotifications Hook
 * Manages push notification subscription state and browser integration
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  isPushSupported,
  isPushConfigured,
  getPermissionState,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  savePushSubscription,
  deactivatePushSubscription,
  hasActivePushSubscription,
  sendTestNotification,
  type PushPermissionState,
} from "@/lib/pushNotifications";
import { updateUserSettings } from "@/lib/user-settings";

export const pushSubscriptionQueryKey = (userId: string) => 
  ["pushSubscription", userId] as const;

export type PushNotificationStatus = {
  isSupported: boolean;
  isConfigured: boolean;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
};

export function usePushNotifications(userId?: string) {
  const queryClient = useQueryClient();
  const [permissionState, setPermissionState] = useState<PushPermissionState>(
    getPermissionState()
  );
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Query to check if user has active push subscription in DB
  const subscriptionQuery = useQuery({
    queryKey: pushSubscriptionQueryKey(userId ?? ""),
    queryFn: async () => {
      if (!userId) return false;
      return hasActivePushSubscription(userId);
    },
    enabled: !!userId && isPushSupported(),
    staleTime: 30000,
  });

  // Register service worker on mount
  useEffect(() => {
    if (!isPushSupported()) return;

    registerServiceWorker().then((registration) => {
      if (registration) {
        setSwRegistration(registration);
      }
    });

    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        status.addEventListener('change', () => {
          setPermissionState(getPermissionState());
        });
      }).catch(() => {
        // Permissions API not fully supported, that's OK
      });
    }
  }, []);

  // Standalone awareness: auto-prompt for push on first launch in installed PWA
  useEffect(() => {
    if (!userId) return;
    if (!isPushSupported() || !isPushConfigured()) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) return;

    // Only auto-prompt once per user, and only if never denied
    const key = `pwa-push-auto-prompted:${userId}`;
    if (localStorage.getItem(key)) return;
    if (getPermissionState() === 'denied') return;
    if (getPermissionState() === 'granted') return; // already granted

    localStorage.setItem(key, '1');
    // Delay slightly to let the app settle on first launch
    const timer = setTimeout(() => {
      enableMutation.mutate();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Mutation to enable push notifications
  const enableMutation = useMutation({
    retry: 1,
    retryDelay: 2000,
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      if (!isPushSupported()) throw new Error("Push notifications not supported");
      if (!isPushConfigured()) {
        throw new Error("Push notifications aren't configured (missing VITE_VAPID_PUBLIC_KEY)");
      }

      // Step 1: Request permission
      const permission = await requestNotificationPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        throw new Error("Notification permission denied");
      }

      // Step 2: Register service worker if not already
      let registration = swRegistration;
      if (!registration) {
        registration = await registerServiceWorker();
        if (!registration) {
          throw new Error("Failed to register service worker");
        }
        setSwRegistration(registration);
      }

      // Step 3: Subscribe to push
      const subscription = await subscribeToPush(registration);

      // Step 4: Save subscription to Supabase
      await savePushSubscription(userId, subscription);

      // Step 5: Update user settings
      await updateUserSettings(userId, { push_notifications: true });

      return true;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["userSettings", userId] });
      }
    },
  });

  // Mutation to disable push notifications
  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      // Step 1: Unsubscribe from browser push
      if (swRegistration) {
        await unsubscribeFromPush(swRegistration);
      }

      // Step 2: Deactivate subscription in DB (soft delete)
      await deactivatePushSubscription(userId);

      // Step 3: Update user settings
      await updateUserSettings(userId, { push_notifications: false });

      return true;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["userSettings", userId] });
      }
    },
  });

  // Mutation to send test notification
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      await sendTestNotification(userId);
      return true;
    },
  });

  // Subscribe/enable push notifications
  const enablePush = useCallback(async () => {
    return enableMutation.mutateAsync();
  }, [enableMutation]);

  // Unsubscribe/disable push notifications
  const disablePush = useCallback(async () => {
    return disableMutation.mutateAsync();
  }, [disableMutation]);

  // Send test notification
  const sendTest = useCallback(async () => {
    return testMutation.mutateAsync();
  }, [testMutation]);

  // Toggle push notifications (for switch component)
  const togglePush = useCallback(async (enabled: boolean) => {
    if (enabled) {
      return enablePush();
    } else {
      return disablePush();
    }
  }, [enablePush, disablePush]);

  // Set up realtime subscription for push_subscriptions table
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`push_subscriptions:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "push_subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryKey(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const status: PushNotificationStatus = {
    isSupported: isPushSupported(),
    isConfigured: isPushConfigured(),
    permissionState,
    isSubscribed: subscriptionQuery.data ?? false,
    isLoading: subscriptionQuery.isLoading || enableMutation.isPending || disableMutation.isPending,
    error: subscriptionQuery.error as Error | null ?? 
           enableMutation.error as Error | null ?? 
           disableMutation.error as Error | null,
  };

  return {
    ...status,
    enablePush,
    disablePush,
    togglePush,
    sendTest,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
    isSendingTest: testMutation.isPending,
    refetch: subscriptionQuery.refetch,
  };
}
