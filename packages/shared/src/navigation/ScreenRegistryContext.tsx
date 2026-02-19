/**
 * ScreenRegistryContext
 *
 * A React Context that lets the consuming app (apps/mobile) provide
 * real screen implementations to the shared navigation stacks without
 * creating a circular dependency from packages/shared → apps/mobile.
 *
 * Usage:
 *   <ScreenRegistryProvider homeScreens={...} profileScreens={...}>
 *     <RootNavigator />
 *   </ScreenRegistryProvider>
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { HomeStackScreens } from './HomeStack';
import type { ProfileStackScreens } from './ProfileStack';
import type { MessagingStackScreens } from './MessagingStack';

export interface ScreenRegistry {
  homeScreens?: HomeStackScreens;
  profileScreens?: ProfileStackScreens;
  messagingScreens?: MessagingStackScreens;
}

const ScreenRegistryCtx = createContext<ScreenRegistry>({});

export function ScreenRegistryProvider({
  homeScreens,
  profileScreens,
  messagingScreens,
  children,
}: ScreenRegistry & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ homeScreens, profileScreens, messagingScreens }),
    [homeScreens, profileScreens, messagingScreens],
  );
  return (
    <ScreenRegistryCtx.Provider value={value}>
      {children}
    </ScreenRegistryCtx.Provider>
  );
}

export function useScreenRegistry(): ScreenRegistry {
  return useContext(ScreenRegistryCtx);
}
