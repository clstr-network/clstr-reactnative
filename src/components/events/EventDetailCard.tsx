import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Clock,
  Copy,
  Check,
  Share2,
  ExternalLink,
  CheckCircle,
  Trash2,
  Edit3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserBadge } from "@/components/ui/user-badge";
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
import { format, parseISO } from "date-fns";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import {
  registerForEvent,
  unregisterFromEvent,
  trackExternalRegistrationClick,
  recordEventLinkCopy,
  deleteEvent,
  type Event,
} from "@/lib/events-api";
import { EventShareModal } from "./EventShareModal";
import { SEO } from "@/components/SEO";
import { trackExploreEventsCTAClick } from "@/lib/analytics";
import { getEventStatus } from "@/lib/event-status";

interface EventDetailCardProps {
  event: Event;
  onEventUpdated?: () => void;
}

/**
 * EventDetailCard - Full interactive view for authenticated users
 * 
 * Features:
 * ✅ Full event details
 * ✅ Register/Unregister
 * ✅ Share to connections
 * ✅ Copy link
 * ✅ Delete (creator only)
 * ✅ SEO metadata
 * ✅ Explore more events CTA
 */
export function EventDetailCard({ event, onEventUpdated }: EventDetailCardProps) {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const shareUrl = `${window.location.origin}/event/${event.id}`;
  const copied = copiedText === shareUrl;

  const eventDate = parseISO(event.event_date);
  const { isPast: isPastEvent, isUpcoming: isUpcomingEvent, isOngoing } = getEventStatus({
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
  });
  const isUpcoming = isUpcomingEvent || isOngoing;
  const isCreator = profile?.id === event.creator_id;

  // SEO description - truncate for meta tags
  const seoDescription = event.description 
    ? event.description.slice(0, 155) + (event.description.length > 155 ? "..." : "")
    : `${isUpcoming ? "Upcoming" : "Completed"} event: ${event.title} on ${format(eventDate, "MMMM dd, yyyy")}`;

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

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
    toast({
      title: "Event link copied",
      description: "Share this link with anyone",
    });
    recordEventLinkCopy(event.id);
  };

  // Navigate to full events listing with analytics
  const handleExploreMoreEvents = () => {
    trackExploreEventsCTAClick({
      source: "authenticated_event",
      event_id: event.id,
      is_authenticated: true,
    });
    navigate("/events");
  };

  const handleRegister = async () => {
    if (!profile) return;

    // Handle external registration
    if (event.external_registration_link) {
      try {
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
        onEventUpdated?.();
      } catch (error) {
        console.error("Error tracking registration click:", error);
      }
      return;
    }

    // Standard registration flow
    setIsRegistering(true);
    try {
      if (event.is_registered) {
        await unregisterFromEvent(event.id);
        toast({
          title: "Unregistered",
          description: "You have been unregistered from the event.",
        });
      } else {
        await registerForEvent(event.id);
        toast({
          title: "Registered!",
          description: "You have been registered for the event.",
        });
      }
      onEventUpdated?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update registration",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      toast({
        title: "Event Deleted",
        description: "The event has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["event-detail"] });
      navigate("/events");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* SEO Metadata for event page */}
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
                {event.is_registered && !event.external_registration_link && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Registered
                  </Badge>
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

            {/* Creator Actions */}
            {isCreator && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/events?edit=${event.id}`)}
                  title="Edit Event"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this event? This action cannot be undone.
                        All registrations will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Event"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
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
                  {event.virtual_link && event.is_registered && (
                    <a
                      href={event.virtual_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline ml-2"
                    >
                      Join Link
                    </a>
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
              <h3 className="font-semibold mb-2">Attendance</h3>
              <div className="flex items-center gap-2 text-white/60">
                <Users className="h-4 w-4" />
                <span>
                  {event.attendees_count || 0} / {event.max_attendees} registered
                </span>
              </div>
            </div>
          )}

          {/* External registration info */}
          {event.external_registration_link && (
            <div>
              <h3 className="font-semibold mb-2">Registration</h3>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <ExternalLink className="h-4 w-4" />
                <span>External registration via form</span>
              </div>
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

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {/* RSVP Button */}
            {isUpcoming && event.registration_required && (
              <Button
                className="flex-1 min-w-[140px]"
                onClick={handleRegister}
                disabled={isRegistering}
                variant={event.is_registered && !event.external_registration_link ? "secondary" : "default"}
              >
                {isRegistering ? (
                  "Processing..."
                ) : event.external_registration_link ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Register Now
                  </>
                ) : event.is_registered ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Unregister
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            )}

            {/* Past event - RSVP disabled */}
            {isPastEvent && event.registration_required && (
              <Button variant="outline" className="flex-1 min-w-[140px]" disabled>
                Event Ended
              </Button>
            )}

            {/* Share Button */}
            <Button
              variant="outline"
              className="flex-1 min-w-[100px]"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>

            {/* Copy Link */}
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

          {/* Explore More Events CTA */}
          <div className="bg-white/[0.04] rounded-lg p-4 mt-4 border border-white/10">
            <div className="text-center">
              <h4 className="font-semibold mb-1">Discover More Events</h4>
              <p className="text-sm text-white/60 mb-3">
                Browse all upcoming events in your campus network
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

      {/* Share Modal */}
      <EventShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        event={event}
        onShared={onEventUpdated}
      />
    </>
  );
}
