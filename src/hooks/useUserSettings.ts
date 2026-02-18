import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
  type UserSettingsUpdate,
} from "@/lib/user-settings";
import { assertValidUuid } from "@/lib/uuid";

export const userSettingsQueryKey = (userId: string) => ["userSettings", userId] as const;

export function useUserSettings(userId?: string) {
  const queryClient = useQueryClient();

  if (userId) {
    assertValidUuid(userId, "userId");
  }

  const query = useQuery({
    queryKey: userSettingsQueryKey(userId ?? ""),
    queryFn: async () => {
      if (!userId) throw new Error("Missing userId");
      return getUserSettings(userId);
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (updates: UserSettingsUpdate) => {
      if (!userId) throw new Error("Missing userId");
      return updateUserSettings(userId, updates);
    },
    onSuccess: (data) => {
      if (!userId) return;
      queryClient.setQueryData(userSettingsQueryKey(userId), data);
      queryClient.invalidateQueries({ queryKey: userSettingsQueryKey(userId) });
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_settings:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_settings",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: userSettingsQueryKey(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return {
    ...query,
    settings: query.data as UserSettings | undefined,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
