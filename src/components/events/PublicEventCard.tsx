import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Video, Users, Clock, Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserBadge } from "@/components/ui/user-badge";
import { format, parseISO } from "date-fns";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { trackPublicEventView, trackExploreEventsCTAClick } from "@/lib/analytics";
import { getEventStatus } from "@/lib/event-status";
import { trackExternalRegistrationClick, type Event } from "@/lib/events-api";

interface PublicEventCardProps {
  event: Event;
  onAuthRequired: () => void;
}

/**
 * PublicEventCard - Read-only view for unauthenticated users
 * 
 * What they CAN see:
 * ✅ Event title, description
 * ✅ Date, time, location
 * ✅ Organizer name & avatar
 * ✅ Tags and category
 * ✅ Attendance count
 * ✅ Copy link
 * ✅ External registration link (if provided)
 * 
 * What they CANNOT do (redirects to signup/login):
 * ❌ Register/RSVP (internal)
 * ❌ Share to connections
 * ❌ Save event
 * 
 * CTA Flow:
 * - "Explore More Events" → /signup?redirect=/events (if not logged in)
 */
export function PublicEventCard({ event, onAuthRequired }: PublicEventCardProps) {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const navigate = useNavigate();

  const shareUrl = `${window.location.origin}/event/${event.id}`;
  const copied = copiedText === shareUrl;

  // Track public event view on mount
  useEffect(() => {
    trackPublicEventView(event.id);
  }, [event.id]);

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
    toast({
      title: "Event link copied",
      description: "Share this link with anyone",
    });
  };

  const handleExternalRegistration = async () => {
    if (!event.external_registration_link) {
      onAuthRequired();
      return;
    }

    // Ensure the URL has a protocol
    let registrationUrl = event.external_registration_link.trim();
    if (!/^https?:\/\//i.test(registrationUrl)) {
      registrationUrl = `https://${registrationUrl}`;
    }

    await trackExternalRegistrationClick(event.id);
    window.open(registrationUrl, "_blank", "noopener,noreferrer");
    toast({
      title: "Redirecting to Registration",
      description: "Opening external registration form...",
    });
  };

  const eventDate = parseISO(event.event_date);
  const { isPast: isPastEvent, isUpcoming: isUpcomingEvent, isOngoing } = getEventStatus({
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
  });

  const isUpcoming = isUpcomingEvent || isOngoing;

  // Handler for "Explore More Events" CTA - redirects to signup with redirect param
  const handleExploreMoreEvents = () => {
    // Track CTA click
    trackExploreEventsCTAClick({
      source: "public_event",
      event_id: event.id,
      is_authenticated: false,
    });
    navigate("/signup?redirect=/events");
  };

  // Generate JSON-LD structured data for the event (Schema.org Event type)
  // Use proper eventStatus for past events
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description || `Event at ${event.location || "Virtual"}`,
    "startDate": event.start_time ? `${event.event_date}T${event.start_time}` : event.event_date,
    "endDate": event.end_time ? `${event.event_date}T${event.end_time}` : undefined,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": event.is_virtual 
      ? "https://schema.org/OnlineEventAttendanceMode" 
      : "https://schema.org/OfflineEventAttendanceMode",
    "location": event.is_virtual 
      ? {
          "@type": "VirtualLocation",
          "url": shareUrl
        }
      : {
          "@type": "Place",
          "name": event.location || "TBD"
        },
    "organizer": event.creator ? {
      "@type": "Person",
      "name": event.creator.full_name || "Event Organizer"
    } : undefined,
    "image": event.cover_image_url || undefined,
    "url": shareUrl
  };

  // SEO description - truncate for meta tags
  const seoDescription = event.description 
    ? event.description.slice(0, 155) + (event.description.length > 155 ? "..." : "")
    : `${isUpcoming ? "Upcoming" : "Completed"} event: ${event.title} on ${format(eventDate, "MMMM dd, yyyy")}`;

  return (
    <>
      {/* SEO Metadata for public event page */}
      <SEO
        title={event.title}
        description={seoDescription}
        type="event"
        image={event.cover_image_url || undefined}
        url={shareUrl}
        jsonLd={eventJsonLd}
      />

      <Card className="max-w-2xl mx-auto">
        {/* Event Header */}
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={isUpcoming ? "default" : "secondary"}>
                  {isUpcoming ? "Upcoming" : "Past Event"}
                </Badge>
              {event.event_type && (
                <Badge variant="outline">{event.event_type}</Badge>
              )}
            </div>
            <CardTitle className="text-xl md:text-2xl">{event.title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(eventDate, "MMMM dd, yyyy")}
              </span>
              {event.start_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {event.start_time}
                  {event.end_time && ` - ${event.end_time}`}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cover image */}
        {event.cover_image_url && (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-48 md:h-64 object-cover rounded-lg"
          />
        )}

        {/* Description */}
        <div>
          <h3 className="font-semibold mb-2">About this Event</h3>
          <p className="text-white/60 whitespace-pre-wrap">
            {event.description || "No description provided."}
          </p>
        </div>

        {/* Location */}
        <div>
          <h3 className="font-semibold mb-2">Location</h3>
          <div className="flex items-center gap-2 text-white/60">
            {event.is_virtual ? (
              <>
                <Video className="h-4 w-4" />
                <span>Virtual Event</span>
                {event.virtual_link && (
                  <Badge variant="secondary" className="ml-2">
                    Link available after registration
                  </Badge>
                )}
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>{event.location || "Location TBD"}</span>
              </>
            )}
          </div>
        </div>

        {/* Attendance */}
        {event.max_attendees && (
          <div>
            <h3 className="font-semibold mb-2">Capacity</h3>
            <div className="flex items-center gap-2 text-white/60">
              <Users className="h-4 w-4" />
              <span>
                {event.max_attendees} spots
              </span>
            </div>
          </div>
        )}

        {/* External registration info */}
        {event.external_registration_link && (
          <div>
            <h3 className="font-semibold mb-2">Registration</h3>
            <a
              href={event.external_registration_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackExternalRegistrationClick(event.id)}
              className="flex items-center gap-2 text-white/60 text-sm hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              <span>External registration via form</span>
            </a>
            {(event.registration_click_count ?? 0) > 0 && (
              <p className="text-xs text-white/60 mt-1">
                {event.registration_click_count} people have registered
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {event.tags
                .filter((tag) => !tag.toLowerCase().startsWith("type:"))
                .map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Organizer */}
        {event.creator && (
          <div>
            <h3 className="font-semibold mb-2">Organizer</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={event.creator.avatar_url || undefined} />
                <AvatarFallback>
                  {event.creator.full_name?.substring(0, 2).toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{event.creator.full_name || "Unknown"}</p>
                {event.creator.role ? (
                  <UserBadge userType={event.creator.role} size="sm" />
                ) : (
                  <p className="text-sm text-white/60">Organizer</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions - Limited for public view */}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {/* Event Status Indicator for past events */}
          {isPastEvent && (
            <div className="w-full mb-2">
              <Badge variant="secondary" className="w-full justify-center py-2">
                Event Completed
              </Badge>
            </div>
          )}

          {/* RSVP Button - Disabled for public view */}
          {isUpcoming && event.registration_required && (
            <Button
              variant="outline"
              className={`flex-1 min-w-[140px] ${
                event.external_registration_link ? "" : "opacity-50"
              }`}
              onClick={event.external_registration_link ? handleExternalRegistration : onAuthRequired}
              disabled={!event.external_registration_link}
            >
              {event.external_registration_link ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Register Now
                </>
              ) : (
                "Register"
              )}
            </Button>
          )}

          {/* Share Button - Disabled */}
          <Button
            variant="outline"
            className="flex-1 min-w-[100px] opacity-50"
            onClick={onAuthRequired}
          >
            Share
          </Button>

          {/* Copy Link - Available to everyone */}
          <Button
            variant="outline"
            className="flex-1 min-w-[100px]"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Explore More Events CTA - Auth Gated */}
        <div className="bg-white/[0.04] rounded-lg p-4 mt-4 border border-white/10">
          <div className="text-center">
            <h4 className="font-semibold mb-1">Discover More Events</h4>
            <p className="text-sm text-white/60 mb-3">
              Join your campus network to explore all upcoming events
            </p>
            <Button 
              onClick={handleExploreMoreEvents}
              className="bg-white/10 hover:bg-white/[0.15]"
            >
              Explore more events
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
