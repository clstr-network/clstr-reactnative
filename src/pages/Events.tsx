import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { useIdentityContext } from "@/contexts/IdentityContext";
import { useFeatureAccess, useRouteGuard } from "@/hooks/useFeatureAccess";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, MapPin, Users, Clock, Plus, CheckCircle, Search, Video, ExternalLink, 
  Share2, Edit3, Trash2, UserPlus, UserMinus, Filter
} from "lucide-react";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { EventShareModal } from "@/components/events/EventShareModal";
import { ErrorState } from "@/components/ui/error-state";
import type { Event as EventType } from "@/lib/events-api";
import { deleteEvent, registerForEvent, trackExternalRegistrationClick, unregisterFromEvent, updateEvent } from "@/lib/events-api";
import { SEO } from "@/components/SEO";
import { assertValidUuid, isValidUuid } from "@clstr/shared/utils/uuid";
import { UserBadge } from "@/components/ui/user-badge";
import {
  fetchClubsWithFollowStatus,
  followClubConnection,
  unfollowClubConnection,
  type ClubProfile,
} from "@/lib/clubs-api";

// ============================================================================
// TYPES
// ============================================================================

type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  is_virtual?: boolean | null;
  virtual_link?: string | null;
  cover_image_url?: string | null;
  max_attendees?: number | null;
  category?: string | null;
  tags?: string[] | null;
  registration_required?: boolean | null;
  registration_deadline?: string | null;
  external_registration_link?: string | null;
  registration_click_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  creator_id?: string;
};

type EventRegistrationRow = {
  event_id: string;
  user_id: string;
  status?: string | null;
  [key: string]: unknown;
};

type Event = EventRow & {
  creator?: ProfileSummary;
  is_registered?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  attendees_count?: number;
  requires_registration?: boolean;
  event_type?: string | null;
  external_registration_link?: string | null;
  registration_click_count?: number;
};

// ============================================================================
// HELPERS
// ============================================================================

const parseEventTime = (
  eventTime: string | null | undefined
): { start_time: string | null; end_time: string | null } => {
  if (!eventTime) return { start_time: null, end_time: null };
  const parts = eventTime.split("-").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return { start_time: null, end_time: null };
  if (parts.length === 1) return { start_time: parts[0], end_time: null };
  return { start_time: parts[0], end_time: parts.slice(1).join(" - ") };
};

const extractEventType = (tags: string[] | null | undefined): string | null => {
  const typeTag = (tags ?? []).find(t => typeof t === "string" && t.toLowerCase().startsWith("type:"));
  if (!typeTag) return null;
  const value = typeTag.slice("type:".length).trim();
  return value || null;
};

const normalizeProfileSummary = (profileData: unknown): ProfileSummary | undefined => {
  if (
    profileData &&
    typeof profileData === "object" &&
    !("error" in profileData) &&
    "id" in profileData
  ) {
    const { id, full_name, avatar_url, role } = profileData as ProfileSummary;
    return {
      id,
      full_name: full_name ?? null,
      avatar_url: avatar_url ?? null,
      role: role ?? "Student",
    };
  }
  return undefined;
};

const getErrorMessage = (error: unknown, fallback = "Something went wrong") =>
  error instanceof Error ? error.message : fallback;

// ============================================================================
// MAIN COMPONENT - UNIFIED EVENTS + CLUBS PAGE
// ============================================================================

export default function Events() {
  const { profile } = useProfile();
  // UC-2 FIX: Use IdentityContext (RPC-backed) as the authoritative source for
  // college_domain instead of ProfileContext which can lag after email transitions.
  const { collegeDomain } = useIdentityContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // FINAL Matrix Permissions
  const { 
    canViewEvents, 
    canCreateEvents, 
    canManageEvents,
    canViewClubs,
    canJoinClub,
    canFollowClub,
    isClub,
  } = useFeatureAccess();
  
  // Route guard - redirect if user cannot view events
  useRouteGuard(canViewEvents, '/home');
  
  // Derive active tab directly from URL Ã¢â‚¬â€ single source of truth, no sync needed
  const activeTab = useMemo(() => searchParams.get('tab') === 'clubs' ? 'clubs' : 'events', [searchParams]);
  
  // ============================================================================
  // EVENTS STATE
  // ============================================================================
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [showOnlyRsvped, setShowOnlyRsvped] = useState(false);

  // Dialog states
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [eventToShare, setEventToShare] = useState<Event | null>(null);
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);
  const [paramError, setParamError] = useState<{ title: string; message: string } | null>(null);

  // Create event form data
  const [newEventData, setNewEventData] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    event_type: "Workshop",
    category: "Academic",
    max_attendees: 0,
    requires_registration: true,
    registration_deadline: "",
    tags: "",
    external_registration_link: "",
  });

  const [editEventData, setEditEventData] = useState({
    id: "",
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    event_type: "Workshop",
    category: "Academic",
    max_attendees: 0,
    requires_registration: true,
    registration_deadline: "",
    tags: "",
    external_registration_link: "",
  });

  // ============================================================================
  // CLUBS STATE
  // ============================================================================
  const [clubSearchQuery, setClubSearchQuery] = useState("");
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const [eventsSubTab, setEventsSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [clubsSubTab, setClubsSubTab] = useState<'all' | 'following'>('all');

  // ============================================================================
  // TAB HANDLING
  // ============================================================================
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'clubs') {
      newParams.set('tab', 'clubs');
    } else {
      newParams.delete('tab');
    }
    setSearchParams(newParams, { replace: true });
  };

  // ============================================================================
  // EVENTS DATA LOADING
  // ============================================================================
  const resetEditEventData = () => {
    setEditEventData({
      id: "",
      title: "",
      description: "",
      event_date: "",
      start_time: "",
      end_time: "",
      location: "",
      is_virtual: false,
      virtual_link: "",
      event_type: "Workshop",
      category: "Academic",
      max_attendees: 0,
      requires_registration: true,
      registration_deadline: "",
      tags: "",
      external_registration_link: "",
    });
  };

  const loadEvents = useCallback(async () => {
    if (!collegeDomain) return;

    try {
      setEventsLoading(true);

      let query = supabase
        .from("events")
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, full_name, avatar_url, role)
        `)
        .eq("college_domain", collegeDomain)
        .order("event_date", { ascending: true });

      if (eventSearchQuery.trim()) {
        query = query.or(`title.ilike.%${eventSearchQuery}%,description.ilike.%${eventSearchQuery}%`);
      }

      type EventQueryResult = (EventRow & { creator: unknown })[];
      const { data: allEvents, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      let normalizedEvents: Event[] = ((allEvents ?? []) as EventQueryResult).map(event => {
        const { start_time, end_time } = parseEventTime(event.event_time);
        return {
          ...event,
          creator: normalizeProfileSummary(event.creator),
          is_registered: false,
          start_time,
          end_time,
          requires_registration: Boolean(event.registration_required),
          event_type: extractEventType(event.tags),
          attendees_count: 0,
          external_registration_link: event.external_registration_link || null,
          registration_click_count: event.registration_click_count ?? 0,
        };
      });

      if (profile.id && normalizedEvents.length) {
        const eventIds = normalizedEvents.map(e => e.id);
        const { data: registrations, error: registrationsError } = await supabase
          .from("event_registrations")
          .select("event_id, status")
          .eq("user_id", profile.id)
          .in("event_id", eventIds);

        if (registrationsError) throw registrationsError;

        const registeredEventIds = new Set(
          (registrations as EventRegistrationRow[] | null)?.map(r => r.event_id) || []
        );

        normalizedEvents = normalizedEvents.map(event => ({
          ...event,
          is_registered: registeredEventIds.has(event.id),
        }));

        // Compute attendee counts for all fetched events.
        const { data: allRegistrations, error: allRegistrationsError } = await supabase
          .from("event_registrations")
          .select("event_id, status")
          .in("event_id", eventIds);

        if (allRegistrationsError) throw allRegistrationsError;

        const attendeeCountByEventId = new Map<string, number>();
        (allRegistrations as EventRegistrationRow[] | null)?.forEach(r => {
          if (!r?.event_id) return;
          if (r.status === "cancelled") return;
          attendeeCountByEventId.set(r.event_id, (attendeeCountByEventId.get(r.event_id) ?? 0) + 1);
        });

        normalizedEvents = normalizedEvents.map(event => ({
          ...event,
          attendees_count: attendeeCountByEventId.get(event.id) ?? 0,
        }));
      }

      setEvents(normalizedEvents);

      const upcoming = normalizedEvents.filter(e => isFuture(parseISO(e.event_date)));
      const past = normalizedEvents.filter(e => isPast(parseISO(e.event_date)));
      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (error) {
      const description = getErrorMessage(error, "Failed to load events");
      console.error("Error loading events:", error);
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setEventsLoading(false);
    }
  }, [collegeDomain, profile?.id, eventSearchQuery, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Realtime subscription for events
  useEffect(() => {
    if (!collegeDomain) return;

    const channel = supabase
      .channel(CHANNELS.events.eventsRealtime())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `college_domain=eq.${collegeDomain}`,
        },
        () => {
          loadEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collegeDomain, loadEvents]);

  // ============================================================================
  // CLUBS DATA LOADING
  // ============================================================================
  const clubsQueryKey = useMemo(
    () => ["clubs", collegeDomain, profile?.id] as const,
    [collegeDomain, profile?.id]
  );

  const {
    data: clubs = [],
    isLoading: clubsLoading,
    isError: clubsError,
    error: clubsErrorValue,
  } = useQuery({
    queryKey: clubsQueryKey,
    queryFn: async () => {
      if (!collegeDomain || !profile?.id) return [] as ClubProfile[];
      return fetchClubsWithFollowStatus({
        profileId: profile.id,
        collegeDomain,
      });
    },
    enabled: Boolean(collegeDomain && profile?.id && canViewClubs),
    staleTime: 15000,
  });

  const followingClubs = useMemo(
    () => clubs.filter((club) => club.is_following),
    [clubs]
  );

  const followMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!profile?.id || !collegeDomain) {
        throw new Error("Profile missing");
      }
      await followClubConnection({
        requesterId: profile.id,
        clubId,
        collegeDomain,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubsQueryKey });
      toast({
        title: canJoinClub ? "Joined" : "Following",
        description: canJoinClub ? "You have joined this club!" : "You are now following this club!",
      });
    },
    onError: (error) => {
      const description = getErrorMessage(error, "Failed to follow club");
      console.error("Error following club:", error);
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, clubId) => {
      if (!clubId) return;
      setFollowingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!profile?.id) throw new Error("Profile missing");
      await unfollowClubConnection({ requesterId: profile.id, clubId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubsQueryKey });
      toast({
        title: canJoinClub ? "Left" : "Unfollowed",
        description: canJoinClub ? "You have left this club." : "You have unfollowed this club.",
      });
    },
    onError: (error) => {
      const description = getErrorMessage(error, "Failed to unfollow club");
      console.error("Error unfollowing club:", error);
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
    onSettled: (_data, _error, clubId) => {
      if (!clubId) return;
      setFollowingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(clubId);
        return next;
      });
    },
  });

  // Realtime subscription for clubs
  useEffect(() => {
    if (!collegeDomain || !canViewClubs) return;

    const channel = supabase
      .channel(CHANNELS.events.clubsRealtime())
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `college_domain=eq.${collegeDomain}`,
        },
        (payload) => {
          if (payload.new && (payload.new as { role?: string }).role === "Club") {
            queryClient.invalidateQueries({ queryKey: clubsQueryKey });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: clubsQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collegeDomain, canViewClubs, clubsQueryKey, queryClient]);

  // ============================================================================
  // URL PARAMETER HANDLING FOR EVENTS
  // ============================================================================
  const clearViewEditParams = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("view");
    nextParams.delete("edit");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openEditDialog = useCallback((event: Event) => {
    if (!profile || !canManageEvents) {
      toast({
        title: "Permission Denied",
        description: "Only Faculty and Clubs can edit events.",
        variant: "destructive",
      });
      return;
    }

    if (event.creator_id !== profile.id) {
      toast({
        title: "Permission Denied",
        description: "Only the event creator can edit this event.",
        variant: "destructive",
      });
      return;
    }

    const { start_time, end_time } = parseEventTime(event.event_time);
    const tagsWithoutType = (event.tags ?? []).filter(
      (tag) => !tag.toLowerCase().startsWith("type:")
    );

    setEditEventData({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      event_date: event.event_date,
      start_time: event.start_time ?? start_time ?? "",
      end_time: event.end_time ?? end_time ?? "",
      location: event.location ?? "",
      is_virtual: Boolean(event.is_virtual),
      virtual_link: event.virtual_link ?? "",
      event_type: event.event_type ?? extractEventType(event.tags) ?? "Workshop",
      category: event.category ?? "Academic",
      max_attendees: event.max_attendees ?? 0,
      requires_registration: event.requires_registration ?? Boolean(event.registration_required),
      registration_deadline: event.registration_deadline ?? "",
      tags: tagsWithoutType.join(", "),
      external_registration_link: event.external_registration_link ?? "",
    });
    setEditEventDialogOpen(true);
  }, [canManageEvents, profile, toast]);

  useEffect(() => {
    const viewEventId = searchParams.get('view');
    const editEventId = searchParams.get('edit');

    if (viewEventId && !isValidUuid(viewEventId)) {
      setParamError({
        title: "Invalid event link",
        message: "The event id in the URL is not a valid UUID.",
      });
      return;
    }

    if (editEventId && !isValidUuid(editEventId)) {
      setParamError({
        title: "Invalid edit link",
        message: "The event id in the URL is not a valid UUID.",
      });
      return;
    }

    if (viewEventId && events.length > 0) {
      const eventToView = events.find(e => e.id === viewEventId);
      if (eventToView) {
        setSelectedEvent(eventToView);
        setEventDetailsOpen(true);
        searchParams.delete('view');
        setSearchParams(searchParams, { replace: true });
      }
    }

    if (editEventId && events.length > 0) {
      const eventToEdit = events.find(e => e.id === editEventId);
      if (eventToEdit) {
        openEditDialog(eventToEdit);
        searchParams.delete('edit');
        setSearchParams(searchParams, { replace: true });
      } else {
        setParamError({
          title: "Event not found",
          message: "We couldn't find the event you tried to edit.",
        });
      }
    }
  }, [searchParams, events, openEditDialog, setSearchParams]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateEvent = async () => {
    if (!profile || !canCreateEvents) {
      toast({
        title: "Permission Denied",
        description: "Only Faculty and Clubs can create events.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tagsArray = newEventData.tags
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const tagsWithType = [
        ...tagsArray.filter(t => !t.toLowerCase().startsWith("type:")),
        `type:${newEventData.event_type}`,
      ];

      const event_time = [newEventData.start_time?.trim(), newEventData.end_time?.trim()]
        .filter(Boolean)
        .join(" - ");

      let normalizedExternalLink = newEventData.external_registration_link?.trim() || null;
      if (normalizedExternalLink && !/^https?:\/\//i.test(normalizedExternalLink)) {
        normalizedExternalLink = `https://${normalizedExternalLink}`;
      }

      const { error } = await supabase.from("events").insert({
        title: newEventData.title,
        description: newEventData.description,
        event_date: newEventData.event_date,
        event_time: event_time || null,
        location: newEventData.location,
        is_virtual: newEventData.is_virtual,
        virtual_link: newEventData.virtual_link || null,
        category: newEventData.category,
        max_attendees: newEventData.max_attendees > 0 ? newEventData.max_attendees : null,
        registration_required: newEventData.requires_registration,
        registration_deadline: newEventData.registration_deadline || null,
        external_registration_link: normalizedExternalLink,
        tags: tagsWithType,
        college_domain: collegeDomain,
        creator_id: profile.id,
      });

      if (error) throw error;

      toast({
        title: "Event Created",
        description: "Your event has been created successfully!",
      });

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });

      setCreateEventDialogOpen(false);
      setNewEventData({
        title: "",
        description: "",
        event_date: "",
        start_time: "",
        end_time: "",
        location: "",
        is_virtual: false,
        virtual_link: "",
        event_type: "Workshop",
        category: "Academic",
        max_attendees: 0,
        requires_registration: true,
        registration_deadline: "",
        tags: "",
        external_registration_link: "",
      });
      loadEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create event"),
        variant: "destructive",
      });
    }
  };

  const handleRegisterForEvent = async (eventId: string) => {
    if (!profile) return;

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (event.external_registration_link) {
        await trackExternalRegistrationClick(eventId);
        loadEvents();
        
        let registrationUrl = event.external_registration_link.trim();
        if (!/^https?:\/\//i.test(registrationUrl)) {
          registrationUrl = `https://${registrationUrl}`;
        }
        
        window.open(registrationUrl, '_blank', 'noopener,noreferrer');
        
        toast({
          title: "Redirecting to Registration",
          description: "Opening external registration form...",
        });
        return;
      }

      if (event.is_registered) {
        await unregisterFromEvent(eventId);

        toast({
          title: "Unregistered",
          description: "You have been unregistered from the event.",
        });
      } else {
        await registerForEvent(eventId);

        toast({
          title: "Registered",
          description: "You have been registered for the event!",
        });
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });
      loadEvents();
    } catch (error) {
      console.error("Error registering for event:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to register for event"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateEvent = async () => {
    if (!profile || !canManageEvents) {
      toast({
        title: "Permission Denied",
        description: "Only Faculty and Clubs can edit events.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tagsArray = editEventData.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const tagsWithType = [
        ...tagsArray.filter((t) => !t.toLowerCase().startsWith("type:")),
        `type:${editEventData.event_type}`,
      ];

      const event_time = [editEventData.start_time?.trim(), editEventData.end_time?.trim()]
        .filter(Boolean)
        .join(" - ");

      let normalizedExternalLink = editEventData.external_registration_link?.trim() || null;
      if (normalizedExternalLink && !/^https?:\/\//i.test(normalizedExternalLink)) {
        normalizedExternalLink = `https://${normalizedExternalLink}`;
      }

      const location = editEventData.is_virtual ? null : editEventData.location.trim();
      const virtual_link = editEventData.is_virtual ? (editEventData.virtual_link?.trim() || null) : null;

      await updateEvent({
        id: editEventData.id,
        title: editEventData.title,
        description: editEventData.description || null,
        event_date: editEventData.event_date,
        event_time: event_time || null,
        location: location || null,
        is_virtual: editEventData.is_virtual,
        virtual_link,
        category: editEventData.category || null,
        max_attendees: editEventData.max_attendees > 0 ? editEventData.max_attendees : null,
        registration_required: editEventData.requires_registration,
        registration_deadline: editEventData.registration_deadline || null,
        tags: tagsWithType,
        external_registration_link: normalizedExternalLink,
      });

      toast({
        title: "Event Updated",
        description: "Your event has been updated successfully!",
      });

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });
      setEditEventDialogOpen(false);
      resetEditEventData();
      loadEvents();
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update event"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      toast({
        title: "Event Deleted",
        description: "The event has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.detail() });
      setEventDetailsOpen(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete event"),
        variant: "destructive",
      });
    }
  };

  // ============================================================================
  // CLUB HANDLERS
  // ============================================================================
  const handleFollowClub = async (clubId: string) => {
    if (!profile?.id || followingInProgress.has(clubId)) return;
    assertValidUuid(profile.id, "profile id");
    assertValidUuid(clubId, "club id");

    setFollowingInProgress((prev) => new Set(prev).add(clubId));
    followMutation.mutate(clubId);
  };

  const handleUnfollowClub = async (clubId: string) => {
    if (!profile?.id || followingInProgress.has(clubId)) return;
    assertValidUuid(profile.id, "profile id");
    assertValidUuid(clubId, "club id");

    setFollowingInProgress((prev) => new Set(prev).add(clubId));
    unfollowMutation.mutate(clubId);
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      if (!clubSearchQuery.trim()) return true;
      const query = clubSearchQuery.toLowerCase();
      return (
        club.full_name?.toLowerCase().includes(query) ||
        club.headline?.toLowerCase().includes(query) ||
        club.bio?.toLowerCase().includes(query)
      );
    });
  }, [clubs, clubSearchQuery]);

  const filteredUpcomingEvents = useMemo(() => {
    if (!showOnlyRsvped) return upcomingEvents;
    return upcomingEvents.filter(e => e.is_registered);
  }, [upcomingEvents, showOnlyRsvped]);

  const filteredPastEvents = useMemo(() => {
    if (!showOnlyRsvped) return pastEvents;
    return pastEvents.filter(e => e.is_registered);
  }, [pastEvents, showOnlyRsvped]);

  // ============================================================================
  // EVENT CARD COMPONENT
  // ============================================================================
  const EventCard = ({ event }: { event: Event }) => {
    const eventDate = parseISO(event.event_date);
    const isUpcoming = isFuture(eventDate);

    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{event.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-white/40 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {format(eventDate, "MMM dd, yyyy")}
              {event.start_time && (
                <>
                  <Clock className="h-3.5 w-3.5 ml-1" />
                  {event.start_time}
                </>
              )}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
            isUpcoming
              ? 'bg-white/[0.08] border-white/15 text-white/60'
              : 'bg-white/[0.04] border-white/10 text-white/40'
          }`}>
            {isUpcoming ? "Upcoming" : "Past"}
          </span>
        </div>

        <p className="text-sm text-white/50 line-clamp-3">{event.description}</p>

        <div className="flex flex-wrap gap-3 text-sm text-white/40">
          <div className="flex items-center gap-1">
            {event.is_virtual ? (
              <>
                <Video className="h-3.5 w-3.5" />
                <span>Virtual</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </>
            )}
          </div>
          {event.max_attendees && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{event.max_attendees}</span>
            </div>
          )}
          {event.external_registration_link && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{event.registration_click_count || 0} registered</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {event.event_type && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50">{event.event_type}</span>
          )}
          {event.category && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50">{event.category}</span>
          )}
          {event.tags?.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-white/40">
              {tag}
            </span>
          ))}
        </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={event.creator?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white/70 text-xs">
                {event.creator?.full_name?.substring(0, 2).toUpperCase() || "O"}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium text-white/80">{event.creator?.full_name || "Unknown"}</p>
              {event.creator?.role ? (
                <UserBadge userType={event.creator.role} size="sm" />
              ) : (
                <p className="text-white/35 text-xs">Organizer</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-auto pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white"
              onClick={() => {
                setSelectedEvent(event);
                setEventDetailsOpen(true);
              }}
            >
              View Details
            </Button>
            <button
              className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
              onClick={() => {
                if (!profile) {
                  navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
                  return;
                }
                setEventToShare(event);
                setShareModalOpen(true);
              }}
              title="Share Event"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            {isUpcoming && event.requires_registration && (
              <Button
                size="sm"
                className={`flex-1 border ${
                  event.is_registered && !event.external_registration_link
                    ? 'bg-white/[0.06] border-white/10 text-white/50 hover:bg-white/10'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/15'
                }`}
                onClick={() => handleRegisterForEvent(event.id)}
              >
                {event.external_registration_link ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Register Now
                  </>
                ) : event.is_registered ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registered
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            )}
          </div>
      </div>
    );
  };

  // ============================================================================
  // CLUB CARD COMPONENT
  // ============================================================================
  const ClubCard = ({ club }: { club: ClubProfile }) => {
    const isProcessing = followingInProgress.has(club.id);
    
    // Permission-based CTA logic from FINAL matrix:
    // - Students: can JOIN clubs
    // - Alumni: can FOLLOW clubs
    // - Faculty: VIEW only
    // - Club: VIEW only (manage own profile elsewhere)
    const canInteract = canJoinClub || canFollowClub;
    const actionLabel = canJoinClub ? "Join" : canFollowClub ? "Follow" : null;
    const unfollowLabel = canJoinClub ? "Leave" : "Unfollow";

    return (
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-col gap-4 h-full overflow-hidden hover:bg-white/[0.06] transition-colors">
        <div className="flex items-start justify-between">
          <Link to={`/profile/${club.id}`} className="flex items-center gap-3 hover:opacity-80 min-w-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
              <AvatarImage src={club.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white/70 text-lg">
                {club.full_name?.substring(0, 2).toUpperCase() || "CL"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-white flex items-center gap-2 truncate">
                {club.full_name || "Unnamed Club"}
                {club.is_verified && (
                  <CheckCircle className="h-4 w-4 text-white/50 flex-shrink-0" />
                )}
              </h3>
              <p className="text-sm text-white/40 line-clamp-1">
                {club.headline || "Campus Club"}
              </p>
            </div>
          </Link>
        </div>

        {club.bio && (
          <p className="text-sm text-white/50 line-clamp-3 break-words">{club.bio}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-white/40">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{club.followers_count} {canJoinClub ? "members" : "followers"}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-1">
          {club.is_following ? (
            <>
              {canInteract && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06] hover:text-white/70"
                  onClick={() => handleUnfollowClub(club.id)}
                  disabled={isProcessing}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : unfollowLabel}
                </Button>
              )}
              <Link to={`/profile/${club.id}`} className={canInteract ? "flex-1" : "w-full"}>
                <Button size="sm" className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Club
                </Button>
              </Link>
            </>
          ) : (
            <>
              {canInteract && actionLabel && (
                <Button
                  size="sm"
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  onClick={() => handleFollowClub(club.id)}
                  disabled={isProcessing}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isProcessing ? "Processing..." : actionLabel}
                </Button>
              )}
              <Link to={`/profile/${club.id}`} className={canInteract ? "flex-1" : "w-full"}>
                <Button variant="outline" size="sm" className="w-full bg-transparent border-white/10 text-white/70 hover:bg-white/[0.06]">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Club
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    );
  };

  // Loading / error states are handled inline within each tab panel below
  // to prevent full-page unmount/remount flickering when switching tabs.

  if (paramError) {
    return (
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container max-w-3xl py-8">
          <SEO
            title={paramError.title}
            description={paramError.message}
            type="website"
          />
          <ErrorState
            title={paramError.title}
            message={paramError.message}
            onRetry={() => {
              setParamError(null);
              clearViewEditParams();
            }}
          />
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <>
      <SEO
        title="Campus Events & Clubs"
        description="Discover events and clubs at your campus. From workshops to student organizations, stay connected with your campus community."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Campus Events & Clubs",
          description: "Browse campus events and discover student clubs and organizations.",
          about: [
            {
              "@type": "Event",
              name: "Campus Event Listings",
            },
            {
              "@type": "Organization",
              name: "Campus Club Directory",
            },
          ],
        }}
      />
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
          <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Campus Events</h1>
              <p className="text-white/50 text-sm">Discover events and clubs at your campus</p>
            </div>
          
          {/* Global CTA: Create Event - Only visible to Faculty and Club */}
          {canCreateEvents && (
            <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
                <DialogHeader className="space-y-2 pb-4">
                  <DialogTitle className="text-lg sm:text-xl text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create New Event</DialogTitle>
                  <DialogDescription className="text-sm text-white/50">
                    {isClub 
                      ? "Create an event for your club" 
                      : "Create a campus-level event for your institution"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title" className="text-sm font-medium text-white/70">Event Title *</Label>
                    <Input
                      id="event-title"
                      value={newEventData.title}
                      onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                      placeholder="e.g., Annual Tech Fest 2024"
                      className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-desc" className="text-sm font-medium text-white/70">Description *</Label>
                    <Textarea
                      id="event-desc"
                      value={newEventData.description}
                      onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                      placeholder="Describe the event..."
                      rows={4}
                      className="w-full resize-none bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-date" className="text-sm font-medium text-white/70">Event Date *</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={newEventData.event_date}
                        onChange={(e) => setNewEventData({ ...newEventData, event_date: e.target.value })}
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-sm font-medium text-white/70">Start Time *</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={newEventData.start_time}
                        onChange={(e) => setNewEventData({ ...newEventData, start_time: e.target.value })}
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-sm font-medium text-white/70">End Time *</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={newEventData.end_time}
                        onChange={(e) => setNewEventData({ ...newEventData, end_time: e.target.value })}
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-type" className="text-sm font-medium text-white/70">Event Type</Label>
                      <Input
                        id="event-type"
                        value={newEventData.event_type}
                        onChange={(e) => setNewEventData({ ...newEventData, event_type: e.target.value })}
                        placeholder="Workshop, Seminar, etc."
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-white/70">Category</Label>
                    <Input
                      id="category"
                      value={newEventData.category}
                      onChange={(e) => setNewEventData({ ...newEventData, category: e.target.value })}
                      placeholder="Academic, Cultural, Technical"
                      className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                    />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <input
                      type="checkbox"
                      id="is-virtual"
                      checked={newEventData.is_virtual}
                      onChange={(e) => setNewEventData({ ...newEventData, is_virtual: e.target.checked })}
                      className="rounded h-4 w-4 accent-white"
                    />
                    <Label htmlFor="is-virtual" className="text-sm font-medium cursor-pointer text-white/70">Virtual Event</Label>
                  </div>
                  {newEventData.is_virtual ? (
                    <div className="space-y-2">
                      <Label htmlFor="virtual-link" className="text-sm font-medium text-white/70">Virtual Event Link</Label>
                      <Input
                        id="virtual-link"
                        value={newEventData.virtual_link}
                        onChange={(e) => setNewEventData({ ...newEventData, virtual_link: e.target.value })}
                        placeholder="https://zoom.us/..."
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium text-white/70">Location *</Label>
                      <Input
                        id="location"
                        value={newEventData.location}
                        onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                        placeholder="e.g., Main Auditorium"
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-attendees" className="text-sm font-medium text-white/70">Max Attendees</Label>
                      <Input
                        id="max-attendees"
                        type="number"
                        min="0"
                        value={newEventData.max_attendees}
                        onChange={(e) => setNewEventData({ ...newEventData, max_attendees: parseInt(e.target.value) || 0 })}
                        placeholder="0 for unlimited"
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-deadline" className="text-sm font-medium text-white/70">Registration Deadline</Label>
                      <Input
                        id="reg-deadline"
                        type="date"
                        value={newEventData.registration_deadline}
                        onChange={(e) => setNewEventData({ ...newEventData, registration_deadline: e.target.value })}
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-white/70">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={newEventData.tags}
                      onChange={(e) => setNewEventData({ ...newEventData, tags: e.target.value })}
                      placeholder="e.g., coding, hackathon, networking"
                      className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                    />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <input
                      type="checkbox"
                      id="requires-registration"
                      checked={newEventData.requires_registration}
                      onChange={(e) => setNewEventData({ ...newEventData, requires_registration: e.target.checked })}
                      className="rounded h-4 w-4 accent-white"
                    />
                    <Label htmlFor="requires-registration" className="text-sm font-medium cursor-pointer text-white/70">Requires Registration</Label>
                  </div>
                  {newEventData.requires_registration && (
                    <div className="space-y-2">
                      <Label htmlFor="external-reg-link" className="text-sm font-medium text-white/70">External Registration Link (Optional)</Label>
                      <Input
                        id="external-reg-link"
                        type="url"
                        value={newEventData.external_registration_link}
                        onChange={(e) => setNewEventData({ ...newEventData, external_registration_link: e.target.value })}
                        placeholder="e.g., https://forms.google.com/..."
                        className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                      />
                      <p className="text-xs text-white/35 mt-1">
                        Users clicking "Register Now" will be redirected to this external link.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => setCreateEventDialogOpen(false)} className="w-full sm:w-auto bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06]">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateEvent}
                      disabled={
                        !newEventData.title ||
                        !newEventData.description ||
                        !newEventData.event_date ||
                        !newEventData.start_time ||
                        !newEventData.end_time ||
                        (!newEventData.is_virtual && !newEventData.location)
                      }
                      className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                    >
                      Create Event
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Primary Tabs: Events | Clubs Ã¢â‚¬â€ translucent container */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
            {([
              { key: 'events' as const, label: 'Events', count: events.length },
              { key: 'clubs' as const, label: 'Clubs', count: clubs.length, disabled: !canViewClubs },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && handleTabChange(tab.key)}
                disabled={tab.disabled}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white/[0.10] text-white border border-white/15'
                    : tab.disabled
                    ? 'text-white/20 cursor-not-allowed border border-transparent'
                    : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ============== EVENTS TAB ============== */}
          <div className={`space-y-4 transition-opacity duration-150${activeTab !== 'events' ? ' opacity-0 h-0 overflow-hidden pointer-events-none absolute' : ' opacity-100'}`}>
            {eventsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
                <span className="ml-3 text-white/50">Loading events...</span>
              </div>
            ) : (<>
              {/* Search and RSVP Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="search"
                    placeholder="Search events..."
                    className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/40" />
                  <Label htmlFor="rsvp-filter" className="text-sm whitespace-nowrap text-white/60">My RSVPs</Label>
                  <Switch
                    id="rsvp-filter"
                    checked={showOnlyRsvped}
                    onCheckedChange={setShowOnlyRsvped}
                  />
                </div>
              </div>

              {/* Events Sub-Tabs: Upcoming | Past */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
                {([
                  { key: 'upcoming' as const, label: 'Upcoming', count: filteredUpcomingEvents.length },
                  { key: 'past' as const, label: 'Past', count: filteredPastEvents.length },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setEventsSubTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      eventsSubTab === tab.key
                        ? 'bg-white/[0.10] text-white border border-white/15'
                        : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      eventsSubTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {eventsSubTab === 'upcoming' && (
                <div className="space-y-4">
                  {filteredUpcomingEvents.length === 0 ? (
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40">
                        {eventSearchQuery || showOnlyRsvped 
                          ? "No upcoming events found matching your filters." 
                          : "No upcoming events."}
                      </p>
                      {canCreateEvents && !eventSearchQuery && !showOnlyRsvped && (
                        <Button className="mt-4 bg-white/10 hover:bg-white/15 text-white border border-white/15" onClick={() => setCreateEventDialogOpen(true)}>
                          Create First Event
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredUpcomingEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {eventsSubTab === 'past' && (
                <div className="space-y-4">
                  {filteredPastEvents.length === 0 ? (
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40">
                        {eventSearchQuery || showOnlyRsvped 
                          ? "No past events found matching your filters." 
                          : "No past events."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPastEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>)}
          </div>

          {/* ============== CLUBS TAB ============== */}
          <div className={`space-y-4 transition-opacity duration-150${activeTab !== 'clubs' ? ' opacity-0 h-0 overflow-hidden pointer-events-none absolute' : ' opacity-100'}`}>
            {clubsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8
                  border-b-2 border-white/30"></div>
                <span className="ml-3 text-white/50">Loading clubs...</span>
              </div>
            ) : clubsError ? (
              <ErrorState
                title="Clubs unavailable"
                message={getErrorMessage(clubsErrorValue, "Failed to load clubs")}
                onRetry={() => queryClient.invalidateQueries({ queryKey: clubsQueryKey })}
              />
            ) : (<>
              {/* Search and Register Club */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Search clubs..."
                    value={clubSearchQuery}
                    onChange={(e) => setClubSearchQuery(e.target.value)}
                    className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
                  />
                </div>
                <Button asChild className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  <Link to="/club-auth">Register your club</Link>
                </Button>
              </div>

              {/* Clubs Sub-Tabs: All | Following */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
                {([
                  { key: 'all' as const, label: 'All Clubs', count: filteredClubs.length },
                  { key: 'following' as const, label: canJoinClub ? 'My Clubs' : 'Following', count: followingClubs.length },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setClubsSubTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      clubsSubTab === tab.key
                        ? 'bg-white/[0.10] text-white border border-white/15'
                        : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      clubsSubTab === tab.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {clubsSubTab === 'all' && (
                <div className="space-y-4">
                  {filteredClubs.length === 0 ? (
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40">
                        {clubSearchQuery
                          ? "No clubs found matching your search."
                          : "No clubs at your campus yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredClubs.map(club => (
                        <ClubCard key={club.id} club={club} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {clubsSubTab === 'following' && (
                <div className="space-y-4">
                  {followingClubs.length === 0 ? (
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40">
                        {canJoinClub 
                          ? "You haven't joined any clubs yet." 
                          : "You're not following any clubs yet."}
                      </p>
                      <p className="text-sm text-white/30 mt-2">
                        {canJoinClub
                          ? "Join clubs to participate in their activities and events."
                          : "Follow clubs to stay updated on their activities and events."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {followingClubs
                        .filter(club => {
                          if (!clubSearchQuery.trim()) return true;
                          const query = clubSearchQuery.toLowerCase();
                          return (
                            club.full_name?.toLowerCase().includes(query) ||
                            club.headline?.toLowerCase().includes(query) ||
                            club.bio?.toLowerCase().includes(query)
                          );
                        })
                        .map(club => (
                          <ClubCard key={club.id} club={club} />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>)}
          </div>

        {/* ============== EDIT EVENT DIALOG ============== */}
        <Dialog
          open={editEventDialogOpen}
          onOpenChange={(open) => {
            setEditEventDialogOpen(open);
            if (!open) {
              resetEditEventData();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6 bg-[#0a0a0a] border-white/10 text-white">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg sm:text-xl text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Event</DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                Update your event details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-event-title" className="text-sm font-medium text-white/70">Event Title *</Label>
                <Input
                  id="edit-event-title"
                  value={editEventData.title}
                  onChange={(e) => setEditEventData({ ...editEventData, title: e.target.value })}
                  placeholder="e.g., Annual Tech Fest 2024"
                  className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-desc" className="text-sm font-medium text-white/70">Description *</Label>
                <Textarea
                  id="edit-event-desc"
                  value={editEventData.description}
                  onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                  placeholder="Describe the event..."
                  rows={4}
                  className="w-full resize-none bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-event-date" className="text-sm font-medium text-white/70">Event Date *</Label>
                  <Input
                    id="edit-event-date"
                    type="date"
                    value={editEventData.event_date}
                    onChange={(e) => setEditEventData({ ...editEventData, event_date: e.target.value })}
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-start-time" className="text-sm font-medium text-white/70">Start Time *</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editEventData.start_time}
                    onChange={(e) => setEditEventData({ ...editEventData, start_time: e.target.value })}
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-end-time" className="text-sm font-medium text-white/70">End Time *</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editEventData.end_time}
                    onChange={(e) => setEditEventData({ ...editEventData, end_time: e.target.value })}
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-event-type" className="text-sm font-medium text-white/70">Event Type</Label>
                  <Input
                    id="edit-event-type"
                    value={editEventData.event_type}
                    onChange={(e) => setEditEventData({ ...editEventData, event_type: e.target.value })}
                    placeholder="Workshop, Seminar, etc."
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="text-sm font-medium text-white/70">Category</Label>
                <Input
                  id="edit-category"
                  value={editEventData.category}
                  onChange={(e) => setEditEventData({ ...editEventData, category: e.target.value })}
                  placeholder="Academic, Cultural, Technical"
                  className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                />
              </div>
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="edit-is-virtual"
                  checked={editEventData.is_virtual}
                  onChange={(e) => setEditEventData({ ...editEventData, is_virtual: e.target.checked })}
                  className="rounded h-4 w-4 accent-white"
                />
                <Label htmlFor="edit-is-virtual" className="text-sm font-medium cursor-pointer text-white/70">Virtual Event</Label>
              </div>
              {editEventData.is_virtual ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-virtual-link" className="text-sm font-medium text-white/70">Virtual Event Link</Label>
                  <Input
                    id="edit-virtual-link"
                    value={editEventData.virtual_link}
                    onChange={(e) => setEditEventData({ ...editEventData, virtual_link: e.target.value })}
                    placeholder="https://zoom.us/..."
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="edit-location" className="text-sm font-medium text-white/70">Location *</Label>
                  <Input
                    id="edit-location"
                    value={editEventData.location}
                    onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                    placeholder="e.g., Main Auditorium"
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-max-attendees" className="text-sm font-medium text-white/70">Max Attendees</Label>
                  <Input
                    id="edit-max-attendees"
                    type="number"
                    min="0"
                    value={editEventData.max_attendees}
                    onChange={(e) => setEditEventData({ ...editEventData, max_attendees: parseInt(e.target.value) || 0 })}
                    placeholder="0 for unlimited"
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reg-deadline" className="text-sm font-medium text-white/70">Registration Deadline</Label>
                  <Input
                    id="edit-reg-deadline"
                    type="date"
                    value={editEventData.registration_deadline}
                    onChange={(e) => setEditEventData({ ...editEventData, registration_deadline: e.target.value })}
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags" className="text-sm font-medium text-white/70">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={editEventData.tags}
                  onChange={(e) => setEditEventData({ ...editEventData, tags: e.target.value })}
                  placeholder="e.g., coding, hackathon, networking"
                  className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                />
              </div>
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="edit-requires-registration"
                  checked={editEventData.requires_registration}
                  onChange={(e) => setEditEventData({ ...editEventData, requires_registration: e.target.checked })}
                  className="rounded h-4 w-4 accent-white"
                />
                <Label htmlFor="edit-requires-registration" className="text-sm font-medium cursor-pointer text-white/70">Requires Registration</Label>
              </div>
              {editEventData.requires_registration && (
                <div className="space-y-2">
                  <Label htmlFor="edit-external-reg-link" className="text-sm font-medium text-white/70">External Registration Link (Optional)</Label>
                  <Input
                    id="edit-external-reg-link"
                    type="url"
                    value={editEventData.external_registration_link}
                    onChange={(e) => setEditEventData({ ...editEventData, external_registration_link: e.target.value })}
                    placeholder="e.g., https://forms.google.com/..."
                    className="w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditEventDialogOpen(false);
                    resetEditEventData();
                  }}
                  className="w-full sm:w-auto bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateEvent}
                  disabled={
                    !editEventData.title ||
                    !editEventData.description ||
                    !editEventData.event_date ||
                    !editEventData.start_time ||
                    !editEventData.end_time ||
                    (!editEventData.is_virtual && !editEventData.location)
                  }
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ============== EVENT DETAILS DIALOG ============== */}
        <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{selectedEvent?.title}</DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-4 mt-2 text-white/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedEvent?.event_date && format(parseISO(selectedEvent.event_date), "MMMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedEvent?.start_time} - {selectedEvent?.end_time}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-white">Description</h3>
                <p className="text-sm text-white/50 whitespace-pre-wrap">
                  {selectedEvent?.description}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-white">Location</h3>
                <div className="flex items-center gap-2 text-white/70">
                  {selectedEvent?.is_virtual ? (
                    <>
                      <Video className="h-4 w-4" />
                      <span className="text-sm">Virtual Event</span>
                      {selectedEvent.virtual_link && (
                        <a
                          href={selectedEvent.virtual_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/50 text-sm underline ml-2 hover:text-white/70"
                        >
                          Join Link
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{selectedEvent?.location}</span>
                    </>
                  )}
                </div>
              </div>

              {selectedEvent?.max_attendees && (
                <div>
                  <h3 className="font-semibold mb-2 text-white">Capacity</h3>
                  <div className="flex items-center gap-2 text-white/70">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{selectedEvent.max_attendees} spots</span>
                  </div>
                </div>
              )}

              {selectedEvent?.external_registration_link && (
                <div>
                  <h3 className="font-semibold mb-2 text-white">Registration</h3>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <ExternalLink className="h-4 w-4" />
                    <span>External registration via form</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
                    <Users className="h-4 w-4" />
                    <span>{selectedEvent.registration_click_count || 0} people have clicked to register</span>
                  </div>
                </div>
              )}

              {selectedEvent?.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-white">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2 text-white">Organizer</h3>
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={selectedEvent?.creator?.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/10 text-white/70">
                      {selectedEvent?.creator?.full_name?.substring(0, 2).toUpperCase() || "O"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm text-white">{selectedEvent?.creator?.full_name || "Unknown"}</p>
                    <p className="text-white/50 text-xs">{selectedEvent?.creator?.role || "Organizer"}</p>
                  </div>
                </div>
              </div>

              {selectedEvent && isFuture(parseISO(selectedEvent.event_date)) && selectedEvent.requires_registration && (
                <Button
                  className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  onClick={() => {
                    handleRegisterForEvent(selectedEvent.id);
                    if (!selectedEvent.external_registration_link) {
                      setEventDetailsOpen(false);
                    }
                  }}
                >
                  {selectedEvent.external_registration_link ? (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Register Now (External Form)
                    </>
                  ) : selectedEvent.is_registered ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Registered
                    </>
                  ) : (
                    "Register for Event"
                  )}
                </Button>
              )}

              {selectedEvent && (
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06]"
                  onClick={() => {
                    if (!profile) {
                      navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
                      return;
                    }
                    setEventToShare(selectedEvent);
                    setShareModalOpen(true);
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>
              )}

              {selectedEvent && profile?.id === selectedEvent.creator_id && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06]"
                    onClick={() => {
                      setEventDetailsOpen(false);
                      openEditDialog(selectedEvent);
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Event
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0a0a0a] border-white/10 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/50">
                          Are you sure you want to delete this event? This action cannot be undone.
                          All registrations will be removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white/50 hover:bg-white/[0.06]">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20"
                        >
                          Delete Event
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Share Modal */}
        {eventToShare && (
          <EventShareModal
            isOpen={shareModalOpen}
            onClose={() => {
              setShareModalOpen(false);
              setEventToShare(null);
            }}
            event={eventToShare as EventType}
            onShared={() => loadEvents()}
          />
        )}
          </div>
        </div>
      </div>
    </>
  );
}
