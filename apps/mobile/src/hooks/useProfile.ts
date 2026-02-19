/**
 * useProfile — Profile data hook.
 *
 * Imports getProfileById from @clstr/core/api/profile.
 * Uses QUERY_KEYS.profile.detail(userId) (S2 enforced).
 * For own profile: gets userId from useAuth().user.id.
 * For other profiles: accepts userId param.
 */
import { useQuery } from '@tanstack/react-query';
import { getProfileById } from '@clstr/core/api/profile';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useAuth } from '@clstr/shared/hooks/useAuth';

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id ?? '';
  const isOwnProfile = targetId === user?.id;

  const query = useQuery({
    queryKey: QUERY_KEYS.profile.detail(targetId),
    queryFn: () => getProfileById(supabase, targetId),
    enabled: !!targetId,
  });

  return {
    ...query,
    profile: query.data,
    isOwnProfile,
  };
}
