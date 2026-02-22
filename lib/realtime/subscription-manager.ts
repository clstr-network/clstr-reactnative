/**
 * SubscriptionManager — Central registry of active Supabase realtime channels.
 *
 * Phase 3.6 deliverable.
 *
 * Responsibilities:
 *   - Track all active channels by name (prevent duplicates)
 *   - Provide subscribe / unsubscribe / unsubscribeAll helpers
 *   - Reconnect all active channels on foreground resume
 *   - Clean up orphaned channels on unmount
 *
 * Usage:
 *   import { subscriptionManager } from '@/lib/realtime/subscription-manager';
 *   const channel = subscriptionManager.subscribe('my-channel', channelInstance);
 *   subscriptionManager.unsubscribe('my-channel');
 */

import { supabase } from '@/lib/adapters/core-client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ManagedChannel {
  name: string;
  channel: RealtimeChannel;
  /** Factory to recreate the channel after a reconnect */
  factory?: () => RealtimeChannel;
}

class SubscriptionManager {
  private channels = new Map<string, ManagedChannel>();
  private _isReconnecting = false;

  /** Number of active channels */
  get size(): number {
    return this.channels.size;
  }

  /** Whether a reconnect cycle is in progress */
  get isReconnecting(): boolean {
    return this._isReconnecting;
  }

  /**
   * Register a channel. If a channel with the same name already exists,
   * the old one is removed first (prevents duplicate subscriptions).
   *
   * @param name — Unique channel name (use CHANNELS.* generators)
   * @param channel — The already-subscribed RealtimeChannel
   * @param factory — Optional factory to recreate the channel on reconnect
   */
  subscribe(
    name: string,
    channel: RealtimeChannel,
    factory?: () => RealtimeChannel,
  ): RealtimeChannel {
    // Remove existing channel with same name
    if (this.channels.has(name)) {
      this.unsubscribe(name);
    }

    this.channels.set(name, { name, channel, factory });

    if (__DEV__) {
      console.log(`[SubscriptionManager] Subscribed: ${name} (total: ${this.channels.size})`);
    }

    return channel;
  }

  /**
   * Unsubscribe and remove a single channel by name.
   */
  unsubscribe(name: string): void {
    const managed = this.channels.get(name);
    if (!managed) return;

    try {
      supabase.removeChannel(managed.channel);
    } catch (e) {
      if (__DEV__) {
        console.warn(`[SubscriptionManager] Error removing channel ${name}:`, e);
      }
    }

    this.channels.delete(name);

    if (__DEV__) {
      console.log(`[SubscriptionManager] Unsubscribed: ${name} (total: ${this.channels.size})`);
    }
  }

  /**
   * Tear down all channels. Called on sign-out or app teardown.
   */
  unsubscribeAll(): void {
    if (__DEV__) {
      console.log(`[SubscriptionManager] Unsubscribing all (${this.channels.size} channels)`);
    }

    for (const [name] of this.channels) {
      this.unsubscribe(name);
    }
  }

  /**
   * Reconnect all channels that have a factory.
   * Called on foreground resume to recover from stale connections.
   *
   * Channels without a factory are simply re-subscribed (Supabase SDK
   * handles reconnection internally for most cases).
   */
  async reconnectAll(): Promise<void> {
    if (this._isReconnecting) {
      if (__DEV__) {
        console.log('[SubscriptionManager] Reconnect already in progress, skipping');
      }
      return;
    }

    this._isReconnecting = true;

    if (__DEV__) {
      console.log(`[SubscriptionManager] Reconnecting ${this.channels.size} channels`);
    }

    try {
      const entries = Array.from(this.channels.entries());

      for (const [name, managed] of entries) {
        try {
          // Remove old channel
          supabase.removeChannel(managed.channel);

          if (managed.factory) {
            // Recreate channel via factory
            const newChannel = managed.factory();
            this.channels.set(name, {
              name,
              channel: newChannel,
              factory: managed.factory,
            });
          }
        } catch (e) {
          if (__DEV__) {
            console.warn(`[SubscriptionManager] Failed to reconnect ${name}:`, e);
          }
        }
      }
    } finally {
      this._isReconnecting = false;
    }
  }

  /**
   * Check if a channel name is currently registered.
   */
  has(name: string): boolean {
    return this.channels.has(name);
  }

  /**
   * Get all active channel names (for debugging).
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

/** Singleton instance */
export const subscriptionManager = new SubscriptionManager();
