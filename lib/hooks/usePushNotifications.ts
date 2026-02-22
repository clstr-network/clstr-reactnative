/**
 * usePushNotifications — Expo Push Notification Hook
 *
 * Phase 8.4 — Handles the full push notification lifecycle:
 *   1. Request permission (deferred — call requestPermission() explicitly)
 *   2. Get Expo push token
 *   3. Register token in device_tokens table via RPC
 *   4. Set up foreground notification display + tap listeners
 *   5. Auto-re-register on login if permission was previously granted
 *   6. Deactivate token on sign-out
 *
 * Adapted from apps/mobile/src/hooks/usePushNotificationsMobile.ts
 * Uses the root-app Supabase client (lib/adapters/core-client).
 *
 * NOTE: expo-notifications is lazily required (not top-level imported) to avoid
 * the DevicePushTokenAutoRegistration side-effect that warns in Expo Go.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/adapters/core-client';
import { useAuth } from '@/lib/auth-context';

// ─── Expo Go detection ───────────────────────────────────────

const isExpoGo = Constants.appOwnership === 'expo';

// ─── Lazy-loaded Notifications module ────────────────────────
// We use a getter so the side-effect-laden module is only loaded in dev builds.

let _Notifications: typeof import('expo-notifications') | null = null;
function getNotifications() {
  if (_Notifications) return _Notifications;
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _Notifications = require('expo-notifications') as typeof import('expo-notifications');
  return _Notifications;
}

// ─── Default foreground notification handler ─────────────────
// Only set up outside Expo Go to avoid the push-token warning.

if (!isExpoGo) {
  const N = getNotifications();
  N?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: N.AndroidNotificationPriority.HIGH,
    }),
  });
}

// ─── Types ───────────────────────────────────────────────────

interface PushNotificationState {
  /** Expo push token (e.g. ExponentPushToken[xxx]) */
  expoPushToken: string | null;
  /** Whether push permissions are granted */
  permissionGranted: boolean;
  /** Whether we're currently requesting permissions or registering */
  isRegistering: boolean;
  /** Any error during setup */
  error: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Get Expo push token. Returns null on simulator or config error. */
async function getExpoPushToken(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications || !Device.isDevice) {
    console.warn('[push] Push notifications require a physical device and a dev build');
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

/** Configure Android notification channel (required for Android 8+). */
async function setupAndroidChannel() {
  const Notifications = getNotifications();
  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
      sound: 'default',
    });
  }
}

// ─── Hook ────────────────────────────────────────────────────

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    permissionGranted: false,
    isRegistering: false,
    error: isExpoGo ? 'Push notifications are not available in Expo Go' : null,
  });

  const tokenRef = useRef<string | null>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // ── Request permission + register token ──
  const requestPermission = useCallback(async () => {
    const Notifications = getNotifications();
    if (!user || !Notifications) return;
    setState((prev) => ({ ...prev, isRegistering: true, error: null }));

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
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

      await setupAndroidChannel();

      const token = await getExpoPushToken();
      if (!token) {
        setState((prev) => ({
          ...prev,
          isRegistering: false,
          error: 'Failed to get push token (simulator or config error)',
        }));
        return;
      }

      // Register token in Supabase via RPC
      const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const { error: rpcError } = await (supabase.rpc as any)('upsert_device_token', {
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
      console.log('[push] Registered push token:', token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[push] Registration error:', msg);
      setState((prev) => ({ ...prev, isRegistering: false, error: msg }));
    }
  }, [user]);

  // ── Deactivate token (call on sign-out) ──
  const deactivateToken = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      await (supabase.rpc as any)('deactivate_device_token', {
        p_expo_push_token: tokenRef.current,
      });
      tokenRef.current = null;
      setState((prev) => ({ ...prev, expoPushToken: null }));
    } catch (err) {
      console.error('[push] Failed to deactivate token:', err);
    }
  }, []);

  // ── Notification listeners ──
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;

    // Notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[push] Notification received:', notification.request.content.title);
    });

    // User tapped on a notification → deep link routing via expo-router
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[push] Notification tapped:', data);
      // Deep link is handled automatically by expo-router's linking config
      // if the notification payload includes a `url` field.
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // ── Auto-register on login if permission was previously granted ──
  useEffect(() => {
    const Notifications = getNotifications();
    if (!user || !Notifications) return;
    let cancelled = false;

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      await setupAndroidChannel();
      if (cancelled) return;

      const token = await getExpoPushToken();
      if (cancelled || !token) return;

      const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      await (supabase.rpc as any)('upsert_device_token', { p_expo_push_token: token, p_device_type: deviceType })
        .then(({ error }: { error: any }) => {
          if (error) console.error('[push] Silent re-register failed:', error);
        });

      if (cancelled) return;

      tokenRef.current = token;
      setState({
        expoPushToken: token,
        permissionGranted: true,
        isRegistering: false,
        error: null,
      });
    })();

    return () => { cancelled = true; };
  }, [user]);

  return {
    ...state,
    requestPermission,
    deactivateToken,
  };
}
