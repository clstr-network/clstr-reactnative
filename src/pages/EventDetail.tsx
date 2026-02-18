import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEventById, getEventByIdPublic } from "@/lib/events-api";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState } from "@/components/ui/error-state";
import { EventDetailCard } from "@/components/events/EventDetailCard";
import { PublicEventCard } from "@/components/events/PublicEventCard";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isValidUuid } from "@/lib/uuid";

const EventSkeleton = () => (
  <Card className="max-w-2xl mx-auto">
    <CardHeader>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-3 mt-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <Skeleton className="h-48 w-full rounded-lg" />
      <div>
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div>
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20 mt-1" />
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </CardContent>
  </Card>
);

const EventDetail = () => {
  const { id } = useParams();
  const eventId = id ?? "";
  const { profile, isLoading: isProfileLoading } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "unauthenticated" | "offline"
  >("checking");
  const isValidEventId = Boolean(eventId) && isValidUuid(eventId);

  // Check auth state
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthStatus("offline");
        return;
      }

      setAuthStatus(data.session ? "authenticated" : "unauthenticated");
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setAuthStatus("unauthenticated");
      } else if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        setAuthStatus("authenticated");
      } else if (event === "INITIAL_SESSION" && !session) {
        setAuthStatus("unauthenticated");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = authStatus === "authenticated";

  const queryKey = useMemo(
    () => ["event-detail", eventId, authStatus] as const,
    [eventId, authStatus]
  );

  // Fetch event - use public API for unauthenticated users, private for authenticated
  const { data: event, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isAuthenticated && profile) {
        // Authenticated user - get full event with registration state
        return await getEventById(eventId);
      }
      // Unauthenticated - use public API
      return await getEventByIdPublic(eventId);
    },
    enabled:
      isValidEventId &&
      authStatus !== "checking" &&
      (authStatus !== "authenticated" || !isProfileLoading),
    staleTime: 1000 * 30,
    retry: 1,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!isValidEventId) return;

    const channel = supabase
      .channel(`event-detail-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: `event_id=eq.${eventId}` },
        () => queryClient.invalidateQueries({ queryKey })
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, isValidEventId, queryClient, queryKey]);

  // Handler for when user tries to interact without auth
  const handleAuthRequired = () => {
    const returnUrl = window.location.pathname;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  if (!eventId || !isValidEventId) {
    return (
      <div className="container max-w-3xl py-8">
        <SEO
          title="Event unavailable"
          description="This event link is invalid or unavailable."
          type="website"
        />
        <ErrorState
          title="Event unavailable"
          message="Missing or invalid event id."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (isLoading || authStatus === "checking") {
    return (
      <div className="container max-w-3xl py-8">
        <EventSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-3xl py-8">
        <SEO
          title="Unable to load event"
          description="We couldn’t load this event right now. Please try again."
          type="website"
        />
        <ErrorState
          title="Unable to load event"
          message={error instanceof Error ? error.message : "Failed to load event."}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-3xl py-8">
        <SEO
          title="Event not found"
          description="This event is no longer available."
          type="website"
        />
        <ErrorState
          title="Event not found"
          message="This event is no longer available."
          onRetry={refetch}
        />
      </div>
    );
  }

  // Render public view for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="container max-w-3xl py-8">
        <PublicEventCard event={event} onAuthRequired={handleAuthRequired} />
      </div>
    );
  }

  // Render full interactive view for authenticated users
  return (
    <div className="container max-w-3xl py-8">
      <EventDetailCard
        event={event}
        onEventUpdated={() => queryClient.invalidateQueries({ queryKey })}
      />
    </div>
  );
};

export default EventDetail;
