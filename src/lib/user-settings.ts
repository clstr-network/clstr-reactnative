import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@/lib/uuid";

export type ProfileVisibility = "public" | "connections" | "private";
export type ThemeMode = "light" | "dark" | "system";

export type UserSettings = {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  message_notifications: boolean;
  connection_notifications: boolean;
  profile_visibility: ProfileVisibility;
  theme_mode: ThemeMode;
  created_at: string;
  updated_at: string;
};

export type UserSettingsUpdate = Partial<Pick<
  UserSettings,
  | "email_notifications"
  | "push_notifications"
  | "message_notifications"
  | "connection_notifications"
  | "profile_visibility"
  | "theme_mode"
>>;

function getSupabaseErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : String(message);
  }
  return undefined;
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const message = (getSupabaseErrorMessage(error) ?? "").toLowerCase();
  const column = columnName.toLowerCase();
  return (
    message.includes("does not exist") &&
    (message.includes(`.${column}`) || message.includes(`"${column}"`) || message.includes(`'${column}'`))
  );
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  assertValidUuid(userId, "userId");

  const fullSelect =
    "user_id,email_notifications,push_notifications,message_notifications,connection_notifications,profile_visibility,theme_mode,created_at,updated_at";
  const legacySelect =
    "user_id,email_notifications,push_notifications,message_notifications,connection_notifications,profile_visibility,created_at,updated_at";

  const { data, error } = await supabase
    .from("user_settings")
    .select(fullSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!isMissingColumnError(error, "theme_mode")) throw error;

    // Backward-compatible fallback when the theme_mode migration hasn't been applied.
    const { data: legacyData, error: legacyError } = await supabase
      .from("user_settings")
      .select(legacySelect)
      .eq("user_id", userId)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (legacyData) return { ...(legacyData as Omit<UserSettings, "theme_mode">), theme_mode: "light" };
  }

  if (data) return data as UserSettings;

  // Self-heal: create a default row for the authenticated user.
  // RLS policy allows inserting a row only when user_id = auth.uid().
  const { data: created, error: createError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select(fullSelect)
    .single();

  if (!createError) return created as UserSettings;

  if (!isMissingColumnError(createError, "theme_mode")) throw createError;

  const { data: createdLegacy, error: createdLegacyError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select(legacySelect)
    .single();

  if (createdLegacyError) throw createdLegacyError;
  return { ...(createdLegacy as Omit<UserSettings, "theme_mode">), theme_mode: "light" };
}

export async function updateUserSettings(
  userId: string,
  updates: UserSettingsUpdate
): Promise<UserSettings> {
  assertValidUuid(userId, "userId");

  const fullSelect =
    "user_id,email_notifications,push_notifications,message_notifications,connection_notifications,profile_visibility,theme_mode,created_at,updated_at";
  const legacySelect =
    "user_id,email_notifications,push_notifications,message_notifications,connection_notifications,profile_visibility,created_at,updated_at";

  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
    .select(fullSelect)
    .single();

  if (!error) return data as UserSettings;

  // Backward-compatibility: theme_mode column may not exist yet.
  if (!isMissingColumnError(error, "theme_mode")) throw error;

  const { theme_mode: _themeMode, ...withoutTheme } = updates;
  const hasAny = Object.keys(withoutTheme).length > 0;

  const { data: legacyData, error: legacyError } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...(hasAny ? withoutTheme : {}) }, { onConflict: "user_id" })
    .select(legacySelect)
    .single();

  if (legacyError) throw legacyError;
  return { ...(legacyData as Omit<UserSettings, "theme_mode">), theme_mode: "light" };
}

// Helper to apply theme to document root
export function applyThemeToDOM(themeMode: ThemeMode): void {
  const root = document.documentElement;

  const effective = getEffectiveTheme(themeMode);
  if (effective === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Get effective theme (resolves 'system' to actual light/dark)
export function getEffectiveTheme(themeMode: ThemeMode): "light" | "dark" {
  if (themeMode === "system") {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themeMode;
}
