import { useEffect, useCallback, useMemo } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { applyThemeToDOM, type ThemeMode } from "@/lib/user-settings";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook for managing theme state with Supabase persistence.
 * - Applies theme to DOM on mount and when settings change
 * - Listens for system preference changes when in 'system' mode
 * - Provides setTheme function that persists to database
 */
export function useTheme(userId?: string) {
  const { settings, updateSettings, isUpdating } = useUserSettings(userId);
  const { toast } = useToast();

  const currentTheme: ThemeMode = useMemo(() => {
    if (!userId) return "light";
    return settings?.theme_mode ?? "light";
  }, [settings?.theme_mode, userId]);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (currentTheme !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeToDOM("system");

    // Support older browsers
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, [currentTheme]);

  // Persist theme change to database
  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      if (!userId) return;

      try {
        applyThemeToDOM(newTheme);
        await updateSettings({ theme_mode: newTheme });
        toast({ title: "Theme updated" });
      } catch (error) {
        // Revert to previous theme on error
        applyThemeToDOM(currentTheme);

        toast({
          title: "Failed to update theme",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    },
    [userId, updateSettings, currentTheme, toast]
  );

  return {
    theme: currentTheme,
    setTheme,
    isUpdating,
    isLoading: !settings && !!userId,
  };
}
