import { useState, useEffect } from "react";
import { Send, Copy, Check, Loader2, Search, Users } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { getConnections, sharePostToMultiple } from "@/lib/social-api";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useProfile } from "@/contexts/ProfileContext";
import { UserBadge } from "@/components/ui/user-badge";

interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  requester?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent: string;
  onShared?: () => void;
}

export function ShareModal({ isOpen, onClose, postId, postContent, onShared }: ShareModalProps) {
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

  const shareUrl = `${window.location.origin}/post/${postId}`;
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
      const data = await getConnections();
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
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
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
      const result = await sharePostToMultiple({
        original_post_id: postId,
        content: shareMessage || undefined,
        receiver_ids: Array.from(selectedConnections),
      });

      toast({
        title: "Post sent!",
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

  // Truncate post content for preview
  const truncatedContent = postContent.length > 100 
    ? postContent.substring(0, 100) + "..." 
    : postContent;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetAndClose();
      }
    }}>
      <DialogContent className="home-theme w-[95vw] max-w-lg sm:max-w-xl mx-auto p-4 sm:p-6 bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">Share Post</DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-1">
            {showConnectionsList 
              ? "Select connections to share this post with"
              : "Choose how you'd like to share this post"
            }
          </DialogDescription>
        </DialogHeader>

        {showConnectionsList ? (
          <div className="space-y-3 sm:space-y-4">
            {/* Post preview */}
            <div className="p-3 sm:p-4 bg-muted rounded-lg text-sm">
              <span className="text-white/60 block font-medium mb-1">Shared:</span>
              <p className="text-foreground line-clamp-2 text-sm sm:text-base">{truncatedContent}</p>
            </div>

            {/* Optional message */}
            <div className="space-y-2">
              <Label htmlFor="share-message" className="text-sm font-medium">Message (optional)</Label>
              <Textarea
                id="share-message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={3}
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
                    Send Post
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {/* Share to Connections */}
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 sm:py-5 sm:px-5 text-left"
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
              className="w-full justify-start h-auto py-4 px-4 sm:py-5 sm:px-5 text-left"
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
                    <div className="text-xs sm:text-sm text-white/60">Share link to this post</div>
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
