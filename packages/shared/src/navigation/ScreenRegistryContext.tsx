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

export interface ScreenRegistry {
  homeScreens?: HomeStackScreens;
  profileScreens?: ProfileStackScreens;
}

const ScreenRegistryCtx = createContext<ScreenRegistry>({});

export function ScreenRegistryProvider({
  homeScreens,
  profileScreens,
  children,
}: ScreenRegistry & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ homeScreens, profileScreens }),
    [homeScreens, profileScreens],
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
