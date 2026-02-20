/**
 * usePushNotificationsMobile — Expo Push Notification Setup
 *
 * Handles the complete lifecycle for mobile push notifications:
 * 1. Requests permission (deferred — not on launch, call requestPermission() explicitly)
 * 2. Gets Expo push token
 * 3. Registers token in device_tokens table
 * 4. Handles token refresh
 * 5. Sets up notification received / response listeners
 * 6. Deactivates token on sign-out
 *
 * Uses expo-notifications + Supabase RPC for device_tokens management.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { useAuth } from '@clstr/shared/hooks/useAuth';

// Configure default notification handling (when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

interface PushNotificationState {
  /** The Expo push token string (e.g., ExponentPushToken[xxx]) */
  expoPushToken: string | null;
  /** Whether push permissions have been granted */
  permissionGranted: boolean;
  /** Whether we're currently requesting permissions or registering */
  isRegistering: boolean;
  /** Any error during setup */
  error: string | null;
}

/**
 * Get the Expo push token for this device.
 * Returns null if the device is not physical (simulator) or if setup fails.
 */
async function getExpoPushToken(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('[push] Push notifications require a physical device');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    return tokenData.data;
  } catch (err) {
    console.error('[push] Failed to get Expo push token:', err);
    return null;
  }
}

/**
 * Configure Android notification channel (required for Android 8+).
 */
async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
      sound: 'default',
    });
  }
}

export function usePushNotificationsMobile() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    permissionGranted: false,
    isRegistering: false,
    error: null,
  });

  const tokenRef = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Request permission and register the push token.
   * Call this explicitly when the user is ready (e.g., after first interaction),
   * NOT on app launch — iOS will only show the permission dialog once.
   */
  const requestPermission = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({ ...prev, isRegistering: true, error: null }));

    try {
      // 1. Check / request permission
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setState((prev) => ({
          ...prev,
          isRegistering: false,
          permissionGranted: false,
          error: 'Push notification permission denied',
        }));
        return;
      }

      // 2. Set up Android channel
      await setupAndroidChannel();

      // 3. Get Expo push token
      const token = await getExpoPushToken();
      if (!token) {
        setState((prev) => ({
          ...prev,
          isRegistering: false,
          error: 'Failed to get push token (simulator or config error)',
        }));
        return;
      }

      // 4. Register token in Supabase
      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
      const { error: rpcError } = await supabase.rpc('upsert_device_token', {
        p_expo_push_token: token,
        p_device_type: deviceType,
      });

      if (rpcError) {
        console.error('[push] Failed to register device token:', rpcError);
        setState((prev) => ({
          ...prev,
          isRegistering: false,
          error: 'Failed to register push token',
        }));
        return;
      }

      tokenRef.current = token;
      setState({
        expoPushToken: token,
        permissionGranted: true,
        isRegistering: false,
        error: null,
      });

      console.log('[push] Registered Expo push token:', token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[push] Registration error:', msg);
      setState((prev) => ({
        ...prev,
        isRegistering: false,
        error: msg,
      }));
    }
  }, [user]);

  /**
   * Deactivate the current token (call on sign-out).
   */
  const deactivateToken = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      await supabase.rpc('deactivate_device_token', {
        p_expo_push_token: tokenRef.current,
      });
      tokenRef.current = null;
      setState((prev) => ({ ...prev, expoPushToken: null }));
    } catch (err) {
      console.error('[push] Failed to deactivate token:', err);
    }
  }, []);

  // ── Set up notification listeners ──────────────────────────────────────
  useEffect(() => {
    // Notification received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('[push] Notification received:', notification.request.content.title);
      });

    // User tapped on a notification — navigation handled in linking.ts subscribe()
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          '[push] Notification tapped:',
          response.notification.request.content.title,
        );
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // ── Auto-register on login (if permission was previously granted) ──────
  // BUG FIX: Added `cancelled` flag to prevent setState after unmount.
  // If the component unmounts before the async chain completes (e.g., user
  // signs out rapidly), setState would fire on an unmounted component.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled) return;

      if (status === 'granted') {
        // Permission already granted — silently re-register token
        await setupAndroidChannel();
        if (cancelled) return;

        const token = await getExpoPushToken();
        if (cancelled || !token) return;

        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
        await supabase
          .rpc('upsert_device_token', {
            p_expo_push_token: token,
            p_device_type: deviceType,
          })
          .then(({ error }) => {
            if (error) {
              console.error('[push] Silent re-register failed:', error);
            }
          });

        if (cancelled) return;

        tokenRef.current = token;
        setState({
          expoPushToken: token,
          permissionGranted: true,
          isRegistering: false,
          error: null,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return {
    ...state,
    requestPermission,
    deactivateToken,
  };
}
