/**
 * usePortfolioEditor Ã¢â‚¬â€ Full profile editor hook for the mobile portfolio screen.
 *
 * Mirrors the web's usePortfolioEditor:
 * - Loads full profile + related data from Supabase
 * - Holds ProfileData in local state for instant preview
 * - Auto-saves settings, manual saveProfile for data changes
 * - Realtime subscriptions on profile sub-tables
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/adapters/core-client';
import { CHANNELS } from '@/lib/channels';
import { QUERY_KEYS } from '@/lib/query-keys';
import { updatePortfolioSettings } from '@/lib/api/portfolio';
import {
  userProfileToProfileData,
  embedPortfolioSettings,
} from '@clstr/core/api/portfolio-adapter';
import type { ProfileData, PortfolioSettings } from '@clstr/core/types/portfolio';

/**
 * Loads the current user's profile from Supabase, converts it to ProfileData,
 * and provides { profile, updateProfile, updateSettings, saveProfile } API.
 *
 * Settings are auto-saved. Profile data is saved when saveProfile() is called.
 */
export function usePortfolioEditor(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);

  // Keep ref in sync with state for realtime callbacks
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 1. Load full profile from Supabase
  const { data: rawProfile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.portfolioEditorProfile(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null;

      // Fetch profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch related data in parallel
      const [eduRes, expRes, skillRes, projRes, postRes] = await Promise.all([
        supabase.from('profile_education').select('*').eq('profile_id', userId),
        supabase.from('profile_experience').select('*').eq('profile_id', userId),
        supabase.from('profile_skills').select('*').eq('profile_id', userId),
        supabase.from('profile_projects').select('*').eq('profile_id', userId),
        supabase
          .from('posts')
          .select('id, content, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (eduRes.error) throw eduRes.error;
      if (expRes.error) throw expRes.error;
      if (skillRes.error) throw skillRes.error;
      if (projRes.error) throw projRes.error;
      if (postRes.error) throw postRes.error;

      return {
        ...(data as Record<string, unknown>),
        education: eduRes.data ?? [],
        experience: expRes.data ?? [],
        skills: skillRes.data ?? [],
        projects: projRes.data ?? [],
        posts: postRes.data ?? [],
      };
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  // 2. Convert to ProfileData when raw profile loads
  useEffect(() => {
    if (rawProfile) {
      const converted = userProfileToProfileData(rawProfile as any);
      setProfile(converted);
      setIsDirty(false);
    }
  }, [rawProfile]);

  // 2b. Realtime subscriptions: auto-refetch when profile sub-tables change
  useEffect(() => {
    if (!userId) return;

    const tables = [
      'profile_skills',
      'profile_education',
      'profile_experience',
      'profile_projects',
    ] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(CHANNELS.portfolioEditor(table, userId))
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `profile_id=eq.${userId}` },
          () => {
            if (!isDirtyRef.current) {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.portfolioEditorProfile(userId),
              });
            }
          },
        )
        .subscribe(),
    );

    // Listen for profiles table changes
    const profileChannel = supabase
      .channel(CHANNELS.portfolioEditorProfiles(userId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => {
          if (!isDirtyRef.current) {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.portfolioEditorProfile(userId),
            });
          }
        },
      )
      .subscribe();

    // Listen for posts changes
    const postsChannel = supabase
      .channel(CHANNELS.portfolioEditorPosts(userId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${userId}` },
        () => {
          if (!isDirtyRef.current) {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.portfolioEditorProfile(userId),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profilePosts(userId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileStats(userId) });
          }
        },
      )
      .subscribe();

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [userId, queryClient]);

  // 3. Local update functions
  const updateProfile = useCallback((updates: Partial<ProfileData>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setIsDirty(true);
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<PortfolioSettings>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          settings: { ...prev.settings, ...updates },
        };
      });

      // Auto-save settings to Supabase
      if (userId) {
        updatePortfolioSettings(userId, updates).catch((err) => {
          console.error('Failed to save portfolio settings:', err);
        });
      }
    },
    [userId],
  );

  // 4. Save profile data back to Supabase (all sections)
  const saveProfile = useCallback(async () => {
    if (!userId || !profile || !rawProfile) return;

    setIsSaving(true);
    try {
      // Save basic profile fields
      const socialLinks = (rawProfile as any).social_links ?? {};
      const updatedSocial = {
        ...socialLinks,
        linkedin: profile.linkedin
          ? `https://${profile.linkedin.replace(/^https?:\/\//, '')}`
          : '',
        github: profile.github ? `https://${profile.github.replace(/^https?:\/\//, '')}` : '',
        website: profile.website
          ? `https://${profile.website.replace(/^https?:\/\//, '')}`
          : '',
      };

      // Embed portfolio settings into social_links
      const withSettings = embedPortfolioSettings(updatedSocial, profile.settings);

      const { error } = await (supabase
        .from('profiles') as any)
        .update({
          full_name: profile.name,
          headline: profile.role,
          bio: profile.about,
          location: profile.location,
          social_links: withSettings as any,
        })
        .eq('id', userId);

      if (error) throw error;

      // Ã¢â€â‚¬Ã¢â€â‚¬ Persist education Ã¢â€â‚¬Ã¢â€â‚¬
      const { error: eduDeleteErr } = await (supabase as any)
        .from('profile_education')
        .delete()
        .eq('profile_id', userId);
      if (eduDeleteErr) throw eduDeleteErr;
      if (profile.education.length > 0) {
        const eduRows = profile.education.map((edu) => ({
          profile_id: userId,
          school: edu.institution,
          degree: edu.degree,
          description: edu.field,
          start_date: edu.startYear ? `${edu.startYear}-01-01` : null,
          end_date: edu.endYear && edu.endYear !== 'Present' ? `${edu.endYear}-01-01` : null,
        }));
        const { error: eduErr } = await (supabase as any)
          .from('profile_education')
          .insert(eduRows);
        if (eduErr) throw eduErr;
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Persist experience Ã¢â€â‚¬Ã¢â€â‚¬
      const { error: expDeleteErr } = await (supabase as any)
        .from('profile_experience')
        .delete()
        .eq('profile_id', userId);
      if (expDeleteErr) throw expDeleteErr;
      if (profile.experience.length > 0) {
        const expRows = profile.experience.map((exp) => ({
          profile_id: userId,
          title: exp.role,
          company: exp.company,
          description: exp.description,
          start_date: exp.startDate || null,
          end_date: exp.current ? null : exp.endDate || null,
        }));
        const { error: expErr } = await (supabase as any)
          .from('profile_experience')
          .insert(expRows);
        if (expErr) throw expErr;
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Persist skills Ã¢â€â‚¬Ã¢â€â‚¬
      const { error: skillsDeleteErr } = await (supabase as any)
        .from('profile_skills')
        .delete()
        .eq('profile_id', userId);
      if (skillsDeleteErr) throw skillsDeleteErr;
      if (profile.skills.length > 0) {
        const skillRows = profile.skills.map((skill) => ({
          profile_id: userId,
          name: skill,
          level: 'Intermediate',
        }));
        const { error: skillErr } = await (supabase as any)
          .from('profile_skills')
          .insert(skillRows);
        if (skillErr) throw skillErr;
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Persist projects Ã¢â€â‚¬Ã¢â€â‚¬
      const { error: projectsDeleteErr } = await (supabase as any)
        .from('profile_projects')
        .delete()
        .eq('profile_id', userId);
      if (projectsDeleteErr) throw projectsDeleteErr;
      if (profile.projects.length > 0) {
        const projRows = profile.projects.map((proj) => ({
          profile_id: userId,
          name: proj.title,
          description: proj.description,
          url: proj.link || null,
          skills: proj.tags ?? [],
        }));
        const { error: projErr } = await (supabase as any)
          .from('profile_projects')
          .insert(projRows);
        if (projErr) throw projErr;
      }

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioEditorProfile(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSettings(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileStats(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profilePosts(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioResolve });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioProfile });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });

      setIsDirty(false);
      Alert.alert('Saved', 'Your portfolio has been updated.');
    } catch {
      Alert.alert('Save failed', 'Could not save your changes.');
    } finally {
      setIsSaving(false);
    }
  }, [userId, profile, rawProfile, queryClient]);

  return {
    profile,
    isLoading,
    isDirty,
    isSaving,
    updateProfile,
    updateSettings,
    saveProfile,
  };
}
