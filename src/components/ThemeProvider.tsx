import { useEffect, createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyThemeToDOM, getEffectiveTheme, type ThemeMode } from "@/lib/user-settings";
import { useUserSettings } from "@/hooks/useUserSettings";

interface ThemeContextType {
  isInitialized: boolean;
  themeMode: ThemeMode;
  effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  isInitialized: false,
  themeMode: "light",
  effectiveTheme: "light",
});

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeContext = () => useContext(ThemeContext);

/**
 * ThemeProvider initializes the theme on app load.
 * Theme is persisted in Supabase (user_settings.theme_mode).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const { settings } = useUserSettings(userId);

  const themeMode: ThemeMode = useMemo(() => {
    if (!userId) return "light";
    return settings?.theme_mode ?? "light";
  }, [settings?.theme_mode, userId]);

  const effectiveTheme = useMemo(() => getEffectiveTheme(themeMode), [themeMode]);

  useEffect(() => {
    let isMounted = true;

    const initializeTheme = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUserId(data.session?.user?.id);
        if (!data.session?.user) {
          applyThemeToDOM("light");
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error);
        applyThemeToDOM("light");
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeTheme();

    // Listen for auth state changes to update theme
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        void event;
        setUserId(session?.user?.id);
        if (!session?.user) {
          applyThemeToDOM("light");
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Apply theme whenever persisted theme mode changes
  useEffect(() => {
    applyThemeToDOM(themeMode);
  }, [themeMode]);

  // Listen for system changes in system mode
  useEffect(() => {
    if (themeMode !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeToDOM("system");

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ isInitialized, themeMode, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
