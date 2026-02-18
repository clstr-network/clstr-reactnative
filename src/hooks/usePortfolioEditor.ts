/**
 * usePortfolioEditor.ts
 *
 * Hook that mirrors the showcase's useProfileData pattern:
 * - Loads from Supabase
 * - Holds ProfileData in local state for instant preview
 * - Persists changes back to Supabase
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProfileData, PortfolioSettings } from "@/types/portfolio";
import { userProfileToProfileData, generateSlug, embedPortfolioSettings } from "@/lib/portfolio-adapter";
import { getPortfolioSettings, updatePortfolioSettings } from "@/lib/portfolio-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { assertValidUuid } from "@/lib/uuid";

/**
 * Loads the current user's profile from Supabase, converts it to ProfileData,
 * and provides the same { profile, updateProfile, updateSettings } API
 * as the showcase's useProfileData hook.
 *
 * Changes to settings are auto-saved to Supabase.
 * Changes to profile data are saved when `saveProfile()` is called.
 */
export function usePortfolioEditor(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDirtyRef = useRef(false);

  // Keep ref in sync with state so realtime callbacks can read it without stale closures
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 1. Load full profile from Supabase
  const { data: rawProfile, isLoading } = useQuery({
    queryKey: ["portfolio-editor-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      assertValidUuid(userId, "userId");

      // Fetch profile with related data
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch related data in parallel
      const [eduRes, expRes, skillRes, projRes, postRes] = await Promise.all([
        supabase.from("profile_education").select("*").eq("profile_id", userId),
        supabase.from("profile_experience").select("*").eq("profile_id", userId),
        supabase.from("profile_skills").select("*").eq("profile_id", userId),
        supabase.from("profile_projects").select("*").eq("profile_id", userId),
        supabase.from("posts").select("id, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);

      if (eduRes.error) throw eduRes.error;
      if (expRes.error) throw expRes.error;
      if (skillRes.error) throw skillRes.error;
      if (projRes.error) throw projRes.error;
      if (postRes.error) throw postRes.error;

      return {
        ...data,
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
  //     (e.g. skills/education/experience/projects updated from the Profile page)
  useEffect(() => {
    if (!userId) return;

    const tables = [
      "profile_skills",
      "profile_education",
      "profile_experience",
      "profile_projects",
    ] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(`portfolio-editor-${table}-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `profile_id=eq.${userId}` },
          () => {
            // Only refetch if the editor hasn't been dirtied by the user
            if (!isDirtyRef.current) {
              queryClient.invalidateQueries({ queryKey: ["portfolio-editor-profile", userId] });
            }
          }
        )
        .subscribe()
    );

    // Also listen for profiles table changes (basic info updates from Profile page)
    const profileChannel = supabase
      .channel(`portfolio-editor-profiles-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          if (!isDirtyRef.current) {
            queryClient.invalidateQueries({ queryKey: ["portfolio-editor-profile", userId] });
          }
        }
      )
      .subscribe();

    const postsChannel = supabase
      .channel(`portfolio-editor-posts-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
        () => {
          if (!isDirtyRef.current) {
            queryClient.invalidateQueries({ queryKey: ["portfolio-editor-profile", userId] });
            queryClient.invalidateQueries({ queryKey: ["profile-posts", userId] });
            queryClient.invalidateQueries({ queryKey: ["profile-stats", userId] });
          }
        }
      )
      .subscribe();

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [userId, queryClient]);

  // 3. Local update functions (same API as showcase)
  const updateProfile = useCallback((updates: Partial<ProfileData>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setIsDirty(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<PortfolioSettings>) => {
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
        console.error("Failed to save portfolio settings:", err);
      });
    }
  }, [userId]);

  // 4. Save profile data back to Supabase (all sections)
  const saveProfile = useCallback(async () => {
    if (!userId || !profile || !rawProfile) return;
    assertValidUuid(userId, "userId");

    setIsSaving(true);
    try {
      // Save basic profile fields
      const socialLinks = (rawProfile as any).social_links ?? {};
      const updatedSocial = {
        ...socialLinks,
        linkedin: profile.linkedin ? `https://${profile.linkedin.replace(/^https?:\/\//, "")}` : "",
        github: profile.github ? `https://${profile.github.replace(/^https?:\/\//, "")}` : "",
        website: profile.website ? `https://${profile.website.replace(/^https?:\/\//, "")}` : "",
      };

      // Embed portfolio settings into social_links
      const withSettings = embedPortfolioSettings(updatedSocial, profile.settings);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.name,
          headline: profile.role,
          bio: profile.about,
          location: profile.location,
          social_links: withSettings as any,
        })
        .eq("id", userId);

      if (error) throw error;

      // ── Persist education to profile_education ──
      // Delete existing, then insert current
      const { error: eduDeleteErr } = await (supabase as any).from("profile_education").delete().eq("profile_id", userId);
      if (eduDeleteErr) throw eduDeleteErr;
      if (profile.education.length > 0) {
        const eduRows = profile.education.map((edu) => ({
          profile_id: userId,
          school: edu.institution,
          degree: edu.degree,
          description: edu.field,
          start_date: edu.startYear ? `${edu.startYear}-01-01` : null,
          end_date: edu.endYear && edu.endYear !== "Present" ? `${edu.endYear}-01-01` : null,
        }));
        const { error: eduErr } = await (supabase as any).from("profile_education").insert(eduRows);
        if (eduErr) throw eduErr;
      }

      // ── Persist experience to profile_experience ──
      const { error: expDeleteErr } = await (supabase as any).from("profile_experience").delete().eq("profile_id", userId);
      if (expDeleteErr) throw expDeleteErr;
      if (profile.experience.length > 0) {
        const expRows = profile.experience.map((exp) => ({
          profile_id: userId,
          title: exp.role,
          company: exp.company,
          description: exp.description,
          start_date: exp.startDate || null,
          end_date: exp.current ? null : (exp.endDate || null),
        }));
        const { error: expErr } = await (supabase as any).from("profile_experience").insert(expRows);
        if (expErr) throw expErr;
      }

      // ── Persist skills to profile_skills ──
      const { error: skillsDeleteErr } = await (supabase as any).from("profile_skills").delete().eq("profile_id", userId);
      if (skillsDeleteErr) throw skillsDeleteErr;
      if (profile.skills.length > 0) {
        const skillRows = profile.skills.map((skill) => ({
          profile_id: userId,
          name: skill,
          level: "Intermediate",
        }));
        const { error: skillErr } = await (supabase as any).from("profile_skills").insert(skillRows);
        if (skillErr) throw skillErr;
      }

      // ── Persist projects to profile_projects ──
      const { error: projectsDeleteErr } = await (supabase as any).from("profile_projects").delete().eq("profile_id", userId);
      if (projectsDeleteErr) throw projectsDeleteErr;
      if (profile.projects.length > 0) {
        const projRows = profile.projects.map((proj) => ({
          profile_id: userId,
          name: proj.title,
          description: proj.description,
          url: proj.link || null,
          skills: proj.tags ?? [],
        }));
        const { error: projErr } = await (supabase as any).from("profile_projects").insert(projRows);
        if (projErr) throw projErr;
      }

      // Invalidate queries so both Portfolio Editor and Profile page stay in sync
      queryClient.invalidateQueries({ queryKey: ["portfolio-editor-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-settings", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile-posts", userId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-resolve"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-profile"] });
      // Cross-invalidate Profile page caches so data stays in sync
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      setIsDirty(false);
      toast({ title: "Saved", description: "Your portfolio has been updated." });
    } catch (err) {
      toast({ title: "Save failed", description: "Could not save your changes.", variant: "destructive" });
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
