/**
 * Central export for useful hooks from @uidotdev/usehooks
 * Import these hooks from this file for consistent usage across the app
 */

// Re-export commonly used hooks from @uidotdev/usehooks
export {
  // State hooks
  useToggle,
  useCounter,
  useList,
  useSet,
  useMap,
  useQueue,
  useObjectState,
  useDefault,
  usePrevious,
  useHistoryState,
  
  // Browser Storage hooks
  useLocalStorage,
  useSessionStorage,
  
  // DOM hooks
  useClickAway,
  useHover,
  useLongPress,
  useIntersectionObserver,
  useMeasure,
  useWindowSize,
  useWindowScroll,
  useMouse,
  useLockBodyScroll,
  
  // Timing hooks
  useDebounce,
  useThrottle,
  
  // Browser API hooks
  useCopyToClipboard,
  useDocumentTitle,
  useFavicon,
  useMediaQuery,
  usePreferredLanguage,
  useGeolocation,
  useBattery,
  useNetworkState,
  useOrientation,
  useScript,
  
  // Utility hooks
  useIdle,
  useIsClient,
  useIsFirstRender,
  useVisibilityChange,
  
  // Debug hooks
  useRenderCount,
  useRenderInfo,
} from '@uidotdev/usehooks';

// Export custom hooks
export { useNetworkStatus } from './useNetwork';
export { useIdleDetection } from './useIdleDetection';
export { useTheme } from './useTheme';
export { usePushNotifications } from './usePushNotifications';
export { useFeatureAccess, useRouteGuard } from './useFeatureAccess';
export { useIdentity, useInviteOpsStats } from './useIdentity';
