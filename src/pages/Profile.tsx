
import { useState, useEffect, useCallback } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { useProfile } from "@/contexts/ProfileContext";
import type { UserProfile } from "@clstr/shared/types/profile";
import { supabase } from "@/integrations/supabase/client";
import { getProfileById, removeProfileAvatar, uploadProfileAvatar, validateAvatarFile } from "@/lib/profile";
import { sendConnectionRequest, checkConnectionStatus, getUserPostsCount } from "@/lib/social-api";
import { getConnectionCount, getProfileViewsCount, trackProfileView } from "@/lib/profile-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { assertValidUuid } from "@clstr/shared/utils/uuid";


const normalizeProfileMessageConnectionStatus = (status: string | null): string | null => {
  if (status === "accepted") return "connected";
  if (status === "pending") return "pending";
  if (status === "connected") return "connected";
  return null;
};


const Profile = () => {
  const { id } = useParams();
  const { profile: currentProfile, isLoading: contextLoading, updateProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isAvatarRemoving, setIsAvatarRemoving] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canBypassMessageGate = currentProfile?.role === "Alumni" || currentProfile?.role === "Organization";
  const refreshConnectionStatus = useCallback(async () => {
    if (!profile?.id || isCurrentUser) return;
    const status = await checkConnectionStatus(profile.id);
    setConnectionStatus(normalizeProfileMessageConnectionStatus(status));
  }, [profile?.id, isCurrentUser]);
  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.profile.stats(profile?.id),
    queryFn: async () => {
      if (!profile?.id) throw new Error("Profile missing");
      // Use Promise.allSettled so one failure doesn't cascade and zero out all stats
      const [connectionsResult, profileViewsResult, postsResult] = await Promise.allSettled([
        getConnectionCount(profile.id),
        getProfileViewsCount(profile.id),
        getUserPostsCount(profile.id),
      ]);
      return {
        connections: connectionsResult.status === 'fulfilled' ? connectionsResult.value : 0,
        profileViews: profileViewsResult.status === 'fulfilled' ? profileViewsResult.value : 0,
        posts: postsResult.status === 'fulfilled' ? postsResult.value : 0,
      };
    },
    enabled: Boolean(profile?.id),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (id) {
        try {
          assertValidUuid(id, "profileId");
        } catch (error) {
          if (isMounted) {
            setProfile(null);
            setIsCurrentUser(false);
            setLoadError(error instanceof Error ? error.message : "Invalid profile id");
            setIsRemoteLoading(false);
          }
          return;
        }
      }

      if (!id) {
        if (isMounted) {
          setProfile(currentProfile);
          setIsCurrentUser(true);
          setLoadError(null);
          setIsRemoteLoading(false);
        }
        return;
      }

      if (currentProfile && currentProfile.id === id) {
        if (isMounted) {
          setProfile(currentProfile);
          setIsCurrentUser(true);
          setLoadError(null);
          setIsRemoteLoading(false);
        }
        return;
      }

      setIsCurrentUser(false);
      setIsRemoteLoading(true);
      try {
        // Use getProfileById to fetch profile with related data (projects, etc.)
        const fetchedProfile = await getProfileById(id);

        if (!fetchedProfile) {
          if (isMounted) {
            setProfile(null);
            setLoadError('Profile not found.');
          }
        } else if (isMounted) {
          setProfile(fetchedProfile);
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setProfile(null);
          setLoadError(err instanceof Error ? err.message : 'Unable to load profile');
        }
      } finally {
        if (isMounted) {
          setIsRemoteLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [id, currentProfile]);

  // Check connection status with this user (must be declared before any early returns)
  useEffect(() => {
    if (!profile?.id || isCurrentUser) return;

    const run = async () => {
      try {
        await refreshConnectionStatus();
      } catch (error) {
        console.error('Failed to check connection status:', error);
      }
    };

    void run();
  }, [profile?.id, isCurrentUser, refreshConnectionStatus]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.profile.stats(profile.id))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `requester_id=eq.${profile.id}`,
      }, async () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profile.id) });
        if (!isCurrentUser) {
          await refreshConnectionStatus();
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections',
        filter: `receiver_id=eq.${profile.id}`,
      }, async () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profile.id) });
        if (!isCurrentUser) {
          await refreshConnectionStatus();
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profile_views',
        filter: `profile_id=eq.${profile.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profile.id) }))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: `user_id=eq.${profile.id}`,
      }, () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profile.id) }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isCurrentUser, queryClient, refreshConnectionStatus]);

  useEffect(() => {
    if (!profile?.id || isCurrentUser) return;

    const recordView = async () => {
      try {
        await trackProfileView(profile.id, currentProfile?.id);
      } catch (error) {
        console.error('Failed to record profile view:', error);
      }
    };

    recordView();
  }, [profile?.id, isCurrentUser, currentProfile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let mounted = true;
    const channel = supabase
      .channel(CHANNELS.profile.view(profile.id))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        async () => {
          try {
            const refreshedProfile = await getProfileById(profile.id);
            if (!mounted) return;
            if (!refreshedProfile) {
              setProfile(null);
              setLoadError('This profile is no longer available.');
              return;
            }
            setProfile(refreshedProfile);
            setLoadError(null);
          } catch (err) {
            if (mounted) {
              console.error('Failed to refresh profile from realtime:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if ((contextLoading || isRemoteLoading) && !profile) {
    return (
      <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
        <div className="w-full flex justify-center py-6">
          <div className="w-full max-w-2xl px-4">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-white/50">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
        <div className="w-full flex justify-center py-6">
          <div className="w-full max-w-2xl px-4">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center space-y-4">
              <p className="text-white/50">{loadError || "Sign in or select a profile to view."}</p>
              <p className="text-sm text-white/30">Complete your profile to unlock personalized recommendations.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.full_name || "Community Member";

  // Default project placeholder
  const DEFAULT_PROJECT_IMAGE = "/placeholder-project.svg";

  const projectItems = (profile.projects || []).map(p => ({
    id: p.id || '',
    title: p.name,
    description: p.description || '',
    link: p.url || '',
    imageUrl: p.image_url || DEFAULT_PROJECT_IMAGE
  }));

  const connectionsCount = stats?.connections ?? 0;
  const postsCount = stats?.posts ?? 0;

  const handleConnect = async () => {
    if (!profile?.id) return;

    setIsConnecting(true);
    // Optimistically update status before the API call
    const previousStatus = connectionStatus;
    setConnectionStatus('pending');
    try {
      await sendConnectionRequest(profile.id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.network() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile.stats(profile.id) });
      toast({
        title: "Connection request sent",
        description: `Your request to connect with ${displayName} has been sent.`,
      });
    } catch (error) {
      // Roll back on failure
      setConnectionStatus(previousStatus);
      toast({
        title: "Failed to send request",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMessage = () => {
    if (!profile?.id) return;
    assertValidUuid(profile.id, "profileId");

    if (!canBypassMessageGate && connectionStatus !== "connected") {
      toast({
        title: "Messaging blocked",
        description: "You can message only connected users.",
        variant: "destructive",
      });
      return;
    }

    navigate(`/messaging?partner=${profile.id}`);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id || !isCurrentUser) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid image",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsAvatarUploading(true);
    try {
      const previousAvatarUrl = profile.avatar_url;
      const avatarUrl = await uploadProfileAvatar(file, profile.id);
      await updateProfile({ avatar_url: avatarUrl });
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));

      if (previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
        void removeProfileAvatar(previousAvatarUrl).catch((cleanupError) => {
          console.warn("Previous avatar cleanup failed:", cleanupError);
        });
      }

      toast({
        title: "Profile picture updated",
        description: "Your new photo is now visible on your profile.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not update profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!profile?.id || !isCurrentUser) return;

    if (!profile.avatar_url) {
      toast({
        title: "No profile picture",
        description: "You don't have a profile picture to remove.",
      });
      return;
    }

    setIsAvatarRemoving(true);
    try {
      const previousAvatarUrl = profile.avatar_url;
      await removeProfileAvatar(previousAvatarUrl);
      await updateProfile({ avatar_url: null });
      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));

      toast({
        title: "Profile picture removed",
        description: "Your profile now uses your initials.",
      });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Could not remove profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsAvatarRemoving(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: { name?: string; headline?: string; location?: string; batch?: string; department?: string; bio?: string; socialLinks?: Record<string, string> }) => {
    if (!profile?.id || !isCurrentUser) {
      setIsEditProfileOpen(false);
      return;
    }

    try {
      const updates: Partial<UserProfile> = {};

      if (updatedProfile.name !== undefined) updates.full_name = updatedProfile.name || null;
      if (updatedProfile.headline !== undefined) updates.headline = updatedProfile.headline || null;
      if (updatedProfile.location !== undefined) updates.location = updatedProfile.location || null;
      if (updatedProfile.batch !== undefined) updates.graduation_year = updatedProfile.batch || null;
      if (updatedProfile.department !== undefined) updates.branch = updatedProfile.department || null;
      if (updatedProfile.bio !== undefined) updates.bio = updatedProfile.bio || null;
      if (updatedProfile.socialLinks !== undefined) {
        updates.social_links = {
          ...(profile.social_links || {}),
          ...updatedProfile.socialLinks,
        };
      }

      await updateProfile(updates);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolio.editorProfile() });
      setIsEditProfileOpen(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unable to update profile right now.',
        variant: 'destructive',
      });
    }
  };

  const handleProjectsChange = async () => {
    const profileId = id || currentProfile?.id;
    if (profileId) {
      try {
        const refreshedProfile = await getProfileById(profileId);
        if (refreshedProfile) {
          setProfile(refreshedProfile);
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolio.editorProfile() });
      } catch (error) {
        console.error("Failed to refresh profile after project change:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
      <div className="w-full flex justify-center pb-20 md:pb-6">
        <div className="w-full max-w-2xl px-4 pt-0 md:pt-4 space-y-4">
          <ProfileHeader
            profile={profile}
            isCurrentUser={isCurrentUser}
            connectionStatus={connectionStatus}
            canBypassMessageGate={canBypassMessageGate}
            isConnecting={isConnecting}
            connectionsCount={connectionsCount}
            postsCount={postsCount}
            projectsCount={projectItems.length}
            onConnect={handleConnect}
            onMessage={handleMessage}
            onEditProfile={() => setIsEditProfileOpen(true)}
            onAvatarUpload={handleAvatarUpload}
            isAvatarUploading={isAvatarUploading}
            onAvatarRemove={handleAvatarRemove}
            isAvatarRemoving={isAvatarRemoving}
            onTabChange={setActiveTab}
          />

          <ProfileTabs
            profile={profile}
            isCurrentUser={isCurrentUser}
            projectItems={projectItems}
            onProjectsChange={handleProjectsChange}
            onEditProfile={() => setIsEditProfileOpen(true)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            profile={{
              name: profile?.full_name || '',
              headline: profile?.headline || '',
              location: profile?.location || '',
              batch: profile?.graduation_year || '',
              department: profile?.branch || '',
              bio: profile?.bio || '',
              socialLinks: (profile?.social_links || {}) as { website?: string; linkedin?: string; twitter?: string; facebook?: string; instagram?: string },
            }}
            onSave={handleProfileUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
