import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppStateLifecycle(callbacks: {
  onForeground?: () => void;
  onBackground?: () => void;
}) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        callbacks.onForeground?.();
      }
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        callbacks.onBackground?.();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [callbacks.onForeground, callbacks.onBackground]);
}
