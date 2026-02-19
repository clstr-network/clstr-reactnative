import { Button } from "@/components/ui/button";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { CalendarClock, MapPin, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import { format } from "date-fns";
import { trackExternalRegistrationClick } from "@/lib/events-api";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  is_virtual: boolean | null;
  virtual_link: string | null;
  external_registration_link?: string | null;
  category: string | null;
  tags: string[] | null;
  max_attendees: number | null;
  creator_id: string;
  college_domain: string | null;
  registration_count?: number;
  user_registered?: boolean;
}

interface EventRegistrationRow {
  event_id: string;
  user_id?: string;
  status: string | null;
}

const UpcomingEvents = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["upcoming-events", profile?.id, profile?.college_domain] as const,
    [profile?.id, profile?.college_domain]
  );

  // Fetch upcoming events from Supabase
  const eventsQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<EventData[]> => {
      if (!profile?.id) throw new Error("Not authenticated");
      assertValidUuid(profile.id, "userId");

      const now = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

      // Fetch upcoming events (future events only)
      const baseQuery = supabase
        .from("events")
        .select("id, title, event_date, event_time, location, is_virtual, virtual_link, external_registration_link, category, tags, max_attendees, creator_id, college_domain")
        .gte("event_date", now)
        .order("event_date", { ascending: true })
        .limit(3);

      const { data: events, error } = profile.college_domain
        ? await baseQuery.eq("college_domain", profile.college_domain)
        : await baseQuery;

      if (error) throw error;

      if (!events || events.length === 0) return [];

      // Get registration counts for each event (aligned with Events page logic)
      const eventIds = events.map((e) => e.id);
      
      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select("event_id, user_id, status")
        .in("event_id", eventIds);

      if (regError) {
        console.error("Error fetching registrations:", regError);
      }

      // Count registrations per event and check user registration
      const regCountMap = new Map<string, number>();
      const userRegMap = new Map<string, boolean>();
      
      (registrations as EventRegistrationRow[] | null)?.forEach((reg) => {
        if (reg.status === "cancelled") {
          return;
        }
        regCountMap.set(reg.event_id, (regCountMap.get(reg.event_id) || 0) + 1);
        if (reg.user_id === profile.id) {
          userRegMap.set(reg.event_id, true);
        }
      });

      return events.map((event) => ({
        ...event,
        registration_count: regCountMap.get(event.id) || 0,
        user_registered: userRegMap.get(event.id) || false,
      }));
    },
    enabled: Boolean(profile?.id),
    staleTime: 30000,
  });

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!profile?.id) throw new Error("Not authenticated");
      assertValidUuid(eventId, "eventId");
      assertValidUuid(profile.id, "userId");

      // Check if user is already registered
      const { data: existingReg, error: checkError } = await supabase
        .from("event_registrations")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReg) {
        // Toggle: cancel if confirmed, re-confirm if cancelled
        const newStatus = existingReg.status === "confirmed" ? "cancelled" : "confirmed";
        const { error: updateError } = await supabase
          .from("event_registrations")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", existingReg.id);
        
        if (updateError) throw updateError;
        return { registered: newStatus === "confirmed" };
      } else {
        // Create new registration
        const { error: insertError } = await supabase
          .from("event_registrations")
          .insert({
            event_id: eventId,
            user_id: profile.id,
            college_domain: profile.college_domain,
            status: "confirmed",
          });

        if (insertError) throw insertError;
        return { registered: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: result.registered ? "RSVP Successful" : "RSVP Cancelled",
        description: result.registered
          ? "You have successfully RSVP'd to this event!"
          : "Your RSVP has been cancelled.",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to RSVP";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Realtime subscription for events and registrations
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.events.upcoming(profile.id))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient, queryKey]);

  const handleRSVP = async (event: EventData) => {
    if (!profile?.id) {
      toast({
        title: "Please login",
        description: "You need to login to RSVP for events.",
        variant: "destructive",
      });
      return;
    }

    if (event.external_registration_link) {
      try {
        await trackExternalRegistrationClick(event.id);

        let registrationUrl = event.external_registration_link.trim();
        if (!/^https?:\/\//i.test(registrationUrl)) {
          registrationUrl = `https://${registrationUrl}`;
        }

        window.open(registrationUrl, "_blank", "noopener,noreferrer");

        toast({
          title: "Redirecting to Registration",
          description: "Opening external registration form...",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to open registration link";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      return;
    }

    rsvpMutation.mutate(event.id);
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatEventTime = (timeStr: string | null) => {
    if (!timeStr) return "";
    try {
      // Handle time string format (HH:MM:SS or HH:MM)
      const [hours, minutes] = timeStr.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="alumni-card p-4 md:p-6">
      <div className="mb-4">
        <h3 className="font-medium text-sm text-white/70 uppercase tracking-wide">Upcoming Events</h3>
      </div>

      {eventsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.07] animate-pulse h-32" />
          ))}
        </div>
      ) : eventsQuery.isError ? (
        <div className="text-center py-4 text-sm text-white/50">
          <p>Unable to load events</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => eventsQuery.refetch()}
            className="text-white/60 hover:text-white"
          >
            Try again
          </Button>
        </div>
      ) : (eventsQuery.data ?? []).length === 0 ? (
        <div className="text-center py-6 text-sm text-white/40">
          <CalendarClock className="h-8 w-8 mx-auto mb-2 text-white/20" />
          <p>No upcoming events</p>
          <p className="text-xs mt-1">Check back soon for new events!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(eventsQuery.data ?? []).map((event, index) => {
            const isRegistered = event.user_registered;
            const isFirst = index === 0;

            return (
              <div 
                key={event.id} 
                className={`p-3 bg-white/[0.03] rounded-lg border ${
                  isFirst 
                    ? 'border-white/15' 
                    : 'border-white/[0.07]'
                } hover:bg-white/[0.05] transition-all`}
              >
                {isFirst && (
                  <div className="mb-2">
                    <span className="text-xs bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                      Featured
                    </span>
                  </div>
                )}
                
                <h4 className="font-medium text-white text-sm leading-tight">{event.title}</h4>
                
                <div className="mt-2 space-y-1.5 text-sm text-white/50">
                  <div className="flex items-center">
                    <CalendarClock className="h-4 w-4 mr-2 text-white/30 flex-shrink-0" />
                    <span className="truncate">
                      {formatEventDate(event.event_date)}
                      {event.event_time && `, ${formatEventTime(event.event_time)}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-white/30 flex-shrink-0" />
                    <span className="truncate">
                      {event.is_virtual ? "Virtual Event" : event.location || "Location TBD"}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-white/30 flex-shrink-0" />
                    <span>
                      {event.registration_count || 0} attending
                      {event.max_attendees && ` / ${event.max_attendees} max`}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="flex-1 bg-white/10 border-white/15 text-white hover:bg-white/15"
                    onClick={() => handleRSVP(event)}
                    disabled={rsvpMutation.isPending}
                  >
                    {rsvpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRegistered ? (
                      "Registered âœ“"
                    ) : (
                      event.external_registration_link ? "Register" : "RSVP"
                    )}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="bg-transparent border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
                    asChild
                  >
                    <Link to={`/events`}>
                      Details
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-white/[0.07]">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-center text-sm text-white/60 border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:text-white"
          asChild
        >
          <Link to="/events">
            View All Events â†’
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default UpcomingEvents;
