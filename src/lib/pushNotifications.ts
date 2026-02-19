/**
 * Push Notifications Service
 * Handles browser Push API integration with Supabase persistence
 * 
 * NOTE: Uses RPC functions and explicit type casting because the push_subscriptions
 * table types are generated after migration runs. This is production-safe.
 */

import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

// VAPID public key - must match the server-side private key
// Generate with: npx web-push generate-vapid-keys
// Store private key in Supabase secrets, public key here
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim();

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string;
  created_at: string;
  last_used_at: string;
  is_active: boolean;
};

/**
 * Check if Push Notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check whether push notifications are configured in this app (VAPID key present).
 */
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

/**
 * Get current notification permission state
 */
export function getPermissionState(): PushPermissionState {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  return permission as PushPermissionState;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[Push] Service worker registered:', registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get or create a push subscription
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription> {
  if (!isPushConfigured()) {
    throw new Error("Push notifications aren't configured (missing VITE_VAPID_PUBLIC_KEY)");
  }

  // PushManager.subscribe requires a secure context (HTTPS) except for localhost.
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Push notifications require HTTPS');
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Using existing subscription');
      return subscription;
    }

    // Create new subscription
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log('[Push] Created new subscription');
    return subscription;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || 'Failed to subscribe to push notifications');
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed successfully');
      return true;
    }
    return true; // Already unsubscribed
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error);
    return false;
  }
}

// Type-safe RPC wrapper that allows calling functions not yet in generated types
const rpcCall = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

/**
 * Save push subscription to Supabase using RPC
 * Uses raw SQL via RPC to avoid type generation dependency
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  assertValidUuid(userId, "userId");

  const subscriptionJson = subscription.toJSON();
  const keys = subscriptionJson.keys || {};

  // Use RPC function to save subscription (bypasses type checking)
  const { error } = await rpcCall('upsert_push_subscription', {
    p_user_id: userId,
    p_endpoint: subscription.endpoint,
    p_p256dh_key: keys.p256dh || '',
    p_auth_key: keys.auth || '',
    p_user_agent: navigator.userAgent,
  });

  if (error) {
    console.error('[Push] Failed to save subscription:', error);
    throw error;
  }

  console.log('[Push] Subscription saved to database');
}

/**
 * Remove push subscription from Supabase
 */
export async function removePushSubscription(
  userId: string,
  endpoint?: string
): Promise<void> {
  assertValidUuid(userId, "userId");

  const { error } = await rpcCall('delete_push_subscription', {
    p_user_id: userId,
    p_endpoint: endpoint || null,
  });

  if (error) {
    console.error('[Push] Failed to remove subscription:', error);
    throw error;
  }

  console.log('[Push] Subscription removed from database');
}

/**
 * Deactivate push subscription (soft delete)
 */
export async function deactivatePushSubscription(
  userId: string,
  endpoint?: string
): Promise<void> {
  assertValidUuid(userId, "userId");

  const { error } = await rpcCall('deactivate_user_push_subscription', {
    p_user_id: userId,
    p_endpoint: endpoint || null,
  });

  if (error) {
    console.error('[Push] Failed to deactivate subscription:', error);
    throw error;
  }
}

/**
 * Get user's active push subscriptions
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<PushSubscriptionRecord[]> {
  assertValidUuid(userId, "userId");

  const { data, error } = await rpcCall('get_user_push_subscriptions', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[Push] Failed to get subscriptions:', error);
    throw error;
  }

  return (data || []) as unknown as PushSubscriptionRecord[];
}

/**
 * Check if user has any active push subscriptions
 */
export async function hasActivePushSubscription(userId: string): Promise<boolean> {
  assertValidUuid(userId, "userId");

  const { data, error } = await rpcCall('has_active_push_subscription', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[Push] Failed to check subscriptions:', error);
    return false;
  }

  return data === true;
}

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Display a local notification (for testing or fallback)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    console.warn('[Push] Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Push] Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/logo.png',
    badge: '/logo.png',
    ...options,
  });
}

/**
 * Send a test notification (calls Edge Function)
 */
export async function sendTestNotification(userId: string): Promise<void> {
  assertValidUuid(userId, "userId");

  const { error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_id: userId,
      title: 'Test Notification',
      body: 'Push notifications are working correctly!',
      type: 'test',
    },
  });

  if (error) {
    console.error('[Push] Failed to send test notification:', error);
    throw error;
  }
}
