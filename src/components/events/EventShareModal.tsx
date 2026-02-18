import { useState, useEffect } from "react";
import { Send, Copy, Check, Loader2, Search, Users, Calendar, MapPin, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getConnectionsForSharing, shareEventToMultiple, recordEventLinkCopy, type Event, type Connection } from "@/lib/events-api";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useProfile } from "@/contexts/ProfileContext";
import { format, parseISO } from "date-fns";
import { UserBadge } from "@/components/ui/user-badge";

interface EventShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onShared?: () => void;
}

export function EventShareModal({ isOpen, onClose, event, onShared }: EventShareModalProps) {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [showConnectionsList, setShowConnectionsList] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const shareUrl = `${window.location.origin}/event/${event.id}`;
  const copied = copiedText === shareUrl;

  // Load connections when modal opens and showing connection list
  useEffect(() => {
    if (isOpen && showConnectionsList) {
      loadConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showConnectionsList]);

  const loadConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const data = await getConnectionsForSharing();
      setConnections(data);
    } catch (error) {
      console.error("Failed to load connections:", error);
      toast({
        title: "Failed to load connections",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleCopyLink = async () => {
    copyToClipboard(shareUrl);
    toast({
      title: "Event link copied",
      description: "Share this link with anyone",
    });
    // Record for analytics (non-blocking)
    recordEventLinkCopy(event.id);
  };

  const handleShareToConnections = () => {
    setShowConnectionsList(true);
  };

  const handleToggleConnection = (connectionUserId: string) => {
    setSelectedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionUserId)) {
        newSet.delete(connectionUserId);
      } else {
        newSet.add(connectionUserId);
      }
      return newSet;
    });
  };

  const handleSendToConnections = async () => {
    if (selectedConnections.size === 0) {
      toast({
        title: "No connections selected",
        description: "Please select at least one connection to share with",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      const result = await shareEventToMultiple({
        event_id: event.id,
        receiver_ids: Array.from(selectedConnections),
        message: shareMessage || undefined,
      });

      toast({
        title: "Event shared!",
        description: `Shared with ${result.sent} connection${result.sent !== 1 ? "s" : ""}`,
      });

      onShared?.();
      resetAndClose();
    } catch (error) {
      toast({
        title: "Failed to share",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const resetAndClose = () => {
    setShowConnectionsList(false);
    setShareMessage("");
    setSelectedConnections(new Set());
    setSearchQuery("");
    onClose();
  };

  // Get the other user from connection (not current user)
  const getConnectionUser = (connection: Connection) => {
    if (!profile) return null;
    if (connection.requester_id === profile.id) {
      return connection.receiver;
    }
    return connection.requester;
  };

  // Filter connections by search
  const filteredConnections = connections.filter(conn => {
    const user = getConnectionUser(conn);
    if (!user) return false;
    const name = user.full_name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  // Format event date for preview
  const eventDate = event.event_date ? format(parseISO(event.event_date), "MMM dd, yyyy") : "Date TBD";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetAndClose();
      }
    }}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl mx-auto p-4 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">Share Event</DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-1">
            {showConnectionsList 
              ? "Select connections to share this event with"
              : "Choose how you'd like to share this event"
            }
          </DialogDescription>
        </DialogHeader>

        {showConnectionsList ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Event preview */}
            <div className="p-3 sm:p-4 bg-muted rounded-lg text-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{event.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{eventDate}</p>
                  {event.start_time && (
                    <p className="text-white/60 text-xs">{event.start_time}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/60">
                    {event.is_virtual ? (
                      <>
                        <Video className="h-3 w-3" />
                        <span>Virtual Event</span>
                      </>
                    ) : event.location ? (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional message */}
            <div className="space-y-2">
              <Label htmlFor="share-message" className="text-sm font-medium">Message (optional)</Label>
              <Textarea
                id="share-message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={2}
                placeholder="Add a message..."
                className="resize-none text-sm sm:text-base"
              />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm sm:text-base"
              />
            </div>

            {/* Connections list */}
            <ScrollArea className="h-[200px] sm:h-[240px] border rounded-md">
              {isLoadingConnections ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              ) : filteredConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/60 p-4 sm:p-6">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-sm sm:text-base text-center">
                    {searchQuery 
                      ? "No connections match your search"
                      : "No connections yet"
                    }
                  </p>
                </div>
              ) : (
                <div className="p-2 sm:p-3 space-y-1">
                  {filteredConnections.map(connection => {
                    const user = getConnectionUser(connection);
                    if (!user) return null;

                    return (
                      <div
                        key={connection.id}
                        className="flex items-center gap-3 p-2 sm:p-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleToggleConnection(user.id)}
                      >
                        <Checkbox
                          checked={selectedConnections.has(user.id)}
                          onCheckedChange={() => handleToggleConnection(user.id)}
                          className="shrink-0"
                        />
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs sm:text-sm">
                            {user.full_name?.split(" ").map(n => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium truncate">{user.full_name || "Unknown"}</p>
                          {user.role && (
                            <UserBadge userType={user.role} size="sm" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Selected count */}
            {selectedConnections.size > 0 && (
              <div className="px-2 py-1 bg-primary/10 rounded-md">
                <p className="text-sm text-primary font-medium text-center">
                  {selectedConnections.size} connection{selectedConnections.size !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                onClick={() => {
                  setShowConnectionsList(false);
                  setSelectedConnections(new Set());
                  setSearchQuery("");
                }}
                disabled={isSharing}
              >
                Back
              </Button>
              <Button
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                onClick={handleSendToConnections}
                disabled={isSharing || selectedConnections.size === 0}
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Share Event
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Event Preview Card */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base truncate">{event.title}</h4>
                  <p className="text-white/60 text-xs sm:text-sm mt-0.5">{eventDate}</p>
                  {event.start_time && (
                    <p className="text-white/60 text-xs sm:text-sm">{event.start_time}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {event.is_virtual ? (
                      <Badge variant="secondary" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        Virtual
                      </Badge>
                    ) : event.location ? (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location}
                      </Badge>
                    ) : null}
                  </div>
                  {event.creator && (
                    <p className="text-xs text-white/60 mt-2">
                      By {event.creator.full_name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Share to Connections */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 sm:py-5 sm:px-5 text-left hover:bg-muted/30 hover:text-foreground hover:border-border active:bg-muted/40 focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 outline-none"
              onClick={handleShareToConnections}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm sm:text-base">Share to Connections</div>
                <div className="text-xs sm:text-sm text-white/60">Send privately via message</div>
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-white/60">Or</span>
              </div>
            </div>

            {/* Copy Link */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 sm:py-5 sm:px-5 text-left hover:bg-muted/30 hover:text-foreground hover:border-border active:bg-muted/40 focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 outline-none"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 text-green-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base text-green-600">Link Copied!</div>
                    <div className="text-xs sm:text-sm text-white/60">Paste it anywhere</div>
                  </div>
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5 sm:h-6 sm:w-6 mr-3 sm:mr-4 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">Copy Link</div>
                    <div className="text-xs sm:text-sm text-white/60">Share link to this event</div>
                  </div>
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
