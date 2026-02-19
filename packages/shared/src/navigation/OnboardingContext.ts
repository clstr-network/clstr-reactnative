/**
 * OnboardingGate — React Context that lets RootNavigator know
 * whether the current user has completed onboarding.
 *
 * OnboardingScreen calls `markOnboarded()` after a successful
 * profile upsert; RootNavigator consumes `isOnboarded` to switch
 * between the Onboarding screen and MainTabs.
 */
import React, { createContext, useContext } from 'react';

interface OnboardingGate {
  /** `null` = still loading, `false` = needs onboarding, `true` = done */
  isOnboarded: boolean | null;
  /** Call after successful profile upsert to skip re-query */
  markOnboarded: () => void;
}

const OnboardingContext = createContext<OnboardingGate>({
  isOnboarded: null,
  markOnboarded: () => {},
});

export const OnboardingProvider = OnboardingContext.Provider;
export const useOnboarding = () => useContext(OnboardingContext);
