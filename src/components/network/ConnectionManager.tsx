import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { UserBadge } from "@/components/ui/user-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Check, X, MessageSquare } from "lucide-react";
import {
  sendConnectionRequest,
  getConnectionRequests,
  updateConnectionStatus,
  removeConnection,
  checkConnectionStatus,
  Connection,
} from "@/lib/social-api";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ConnectionButtonProps {
  userId: string;
  userName: string;
  onConnectionChange?: () => void;
}

export const ConnectionButton = ({
  userId,
  userName,
  onConnectionChange,
}: ConnectionButtonProps) => {
  const [status, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadConnectionStatus = async () => {
      try {
        const connectionStatus = await checkConnectionStatus(userId);
        setStatus(connectionStatus);
      } catch (error) {
        console.error("Error checking connection status:", error);
      }
    };

    loadConnectionStatus();
  }, [userId]);

  const handleSendRequest = async () => {
    setIsLoading(true);
    // Optimistically update status and close dialog before API call
    const previousStatus = status;
    setStatus("pending");
    setIsDialogOpen(false);
    setMessage("");
    try {
      await sendConnectionRequest(userId, message.trim() || undefined);
      toast({
        title: "Connection request sent",
        description: `Your request has been sent to ${userName}`,
      });
      onConnectionChange?.();
    } catch (error: unknown) {
      // Roll back on failure
      setStatus(previousStatus);
      const message = error instanceof Error ? error.message : "Unable to send request";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "accepted") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="h-4 w-4 mr-2" />
        Connected
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button variant="outline" size="sm" disabled>
        Pending
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Connection Request</DialogTitle>
          <DialogDescription>
            Send a connection request to {userName}. You can add a personal message.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Add a note (optional)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendRequest} disabled={isLoading}>
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ConnectionRequestsProps {
  onUpdate?: () => void;
}

export const ConnectionRequests = ({ onUpdate }: ConnectionRequestsProps) => {
  const [requests, setRequests] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getConnectionRequests();
      setRequests(data as Connection[]);
    } catch (error: unknown) {
      console.error("Error loading requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (connectionId: string, requesterName: string) => {
    try {
      await updateConnectionStatus(connectionId, "accepted");
      toast({
        title: "Connection accepted",
        description: `You are now connected with ${requesterName}`,
      });
      loadRequests();
      onUpdate?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to update request";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      await updateConnectionStatus(connectionId, "rejected");
      toast({
        title: "Request rejected",
      });
      loadRequests();
      onUpdate?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to reject request";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <UserPlus className="h-12 w-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/60">No pending connection requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={request.requester?.avatar_url || undefined} alt={request.requester?.full_name || 'User'} className="object-cover" />
                <AvatarFallback className="text-xs font-semibold">
                  {request.requester?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{request.requester?.full_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                      {request.requester?.role && (
                        <UserBadge userType={request.requester.role} size="sm" />
                      )}
                      {request.requester?.college_domain && (
                        <span>{request.requester.college_domain}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                {request.message && (
                  <div className="mt-2 p-2 bg-white/[0.04] rounded text-sm">
                    <MessageSquare className="h-4 w-4 inline mr-1 text-white/60" />
                    {request.message}
                  </div>
                )}
                <div className="flex space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() =>
                      handleAccept(request.id, request.requester?.full_name || "")
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
