import { useMemo, useState, useEffect } from "react";
import { Bell, Check, X, Loader2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { acceptConnectionRequest, rejectConnectionRequest } from "@/lib/social-api";
import { assertValidUuid } from "@/lib/uuid";

interface Notification {
  id: string;
  type: string;
  content: string;
  created_at: string;
  read: boolean;
  related_id?: string | null;
}

// Query keys for React Query cache management
const NOTIFICATION_QUERY_KEYS = {
  all: (userId?: string | null) => ['notifications', userId ?? 'anonymous'] as const,
  list: (userId?: string | null) => [...NOTIFICATION_QUERY_KEYS.all(userId), 'list'] as const,
  unreadCount: (userId?: string | null) => [...NOTIFICATION_QUERY_KEYS.all(userId), 'unreadCount'] as const,
};

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeConnectionActionId, setActiveConnectionActionId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        setUserId(user?.id ?? null);
      }
    };

    loadUser();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_, session) => {
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);

      if (!nextUserId) {
        queryClient.removeQueries({ queryKey: ['notifications'] });
      }
    });

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, [queryClient]);

  // Fetch notifications using React Query
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(userId),
    queryFn: async () => {
      if (!userId) return [];
      assertValidUuid(userId, "userId");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!userId,
    staleTime: 10_000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const connectionRelatedIds = useMemo(() => {
    const ids = notifications
      .filter((notification) => notification.type === "connection" && notification.related_id)
      .map((notification) => notification.related_id as string);
    return Array.from(new Set(ids));
  }, [notifications]);

  const { data: connectionStatusById = {} } = useQuery({
    queryKey: [...NOTIFICATION_QUERY_KEYS.all(userId), "connection-status", ...connectionRelatedIds] as const,
    queryFn: async () => {
      if (!userId || connectionRelatedIds.length === 0) return {};

      assertValidUuid(userId, "userId");
      connectionRelatedIds.forEach((id) => assertValidUuid(id, "connectionId"));

      const { data, error } = await supabase
        .from("connections")
        .select("id, status, receiver_id")
        .in("id", connectionRelatedIds);

      if (error) throw error;

      return Object.fromEntries(
        (data || []).map((row) => [row.id, row])
      ) as Record<string, { id: string; status: string; receiver_id: string }>;
    },
    enabled: !!userId && connectionRelatedIds.length > 0,
    staleTime: 5_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isOpen || connectionRelatedIds.length === 0) return;
    queryClient.invalidateQueries({ queryKey: [...NOTIFICATION_QUERY_KEYS.all(userId), "connection-status"] });
  }, [isOpen, connectionRelatedIds.length, queryClient, userId]);

  // Calculate unread count from notifications data
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark single notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");
      assertValidUuid(id, "notificationId");
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Failed to mark as read",
        variant: "destructive",
      });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
      toast({
        title: "All notifications marked as read",
      });
    },
    onError: (error) => {
      console.error("Error marking all as read:", error);
      toast({
        title: "Failed to mark all as read",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");
      assertValidUuid(id, "notificationId");
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
      toast({
        title: "Notification deleted",
      });
    },
    onError: (error) => {
      console.error("Error deleting notification:", error);
      toast({
        title: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  // Clear all notifications mutation
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
      toast({
        title: "All notifications cleared",
      });
    },
    onError: (error) => {
      console.error("Error clearing all notifications:", error);
      toast({
        title: "Failed to clear notifications",
        variant: "destructive",
      });
    },
  });

  // Set up realtime subscription for notifications
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      if (!userId) return;
      assertValidUuid(userId, "userId");

      channel = supabase
        .channel(`notifications-realtime-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });

            // Show toast for new notification
            const notification = payload.new as Notification;
            toast({
              title: "New notification",
              description: notification.content,
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient, toast, userId]);

  const acceptConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, notificationId }: { connectionId: string; notificationId: string }) => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");
      assertValidUuid(connectionId, "connectionId");
      assertValidUuid(notificationId, "notificationId");
      await acceptConnectionRequest(connectionId);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["connectedUsers"] });
      toast({
        title: "Connection accepted",
        description: "You're now connected.",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to accept connection";
      toast({
        title: "Unable to accept",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => setActiveConnectionActionId(null),
  });

  const rejectConnectionMutation = useMutation({
    mutationFn: async ({ connectionId, notificationId }: { connectionId: string; notificationId: string }) => {
      if (!userId) throw new Error("Not authenticated");
      assertValidUuid(userId, "userId");
      assertValidUuid(connectionId, "connectionId");
      assertValidUuid(notificationId, "notificationId");
      await rejectConnectionRequest(connectionId);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all(userId) });
      queryClient.invalidateQueries({ queryKey: ["network"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      queryClient.invalidateQueries({ queryKey: ["connectedUsers"] });
      toast({
        title: "Request declined",
      });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to decline request";
      toast({
        title: "Unable to decline",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => setActiveConnectionActionId(null),
  });

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "connection":
        return "👤";
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "mention":
        return "📌";
      case "event":
        return "📅";
      case "club":
        return "👥";
      case "project":
        return "💼";
      case "message":
        return "✉️";
      default:
        return "🔔";
    }
  };

  // Resolve the parent post for a comment notification so we can deep-link
  const resolveCommentPostId = async (commentId: string) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("post_id")
        .eq("id", commentId)
        .single();

      if (!error && data?.post_id) {
        navigate(`/post/${data.post_id}#comment-${commentId}`);
      } else {
        navigate("/home");
      }
    } catch {
      navigate("/home");
    }
    setIsOpen(false);
  };

  // Resolve the sender of a message notification so we can open the conversation
  const resolveMessageSender = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("id", messageId)
        .single();

      if (!error && data?.sender_id) {
        navigate(`/messaging?user=${data.sender_id}`);
      } else {
        navigate("/messaging");
      }
    } catch {
      navigate("/messaging");
    }
    setIsOpen(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Fire-and-forget mark as read — navigation must feel instant
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    try {
      switch (notification.type) {
        case "connection":
          navigate("/network?tab=requests");
          break;

        case "like":
          if (notification.related_id) {
            navigate(`/post/${notification.related_id}`);
          } else {
            navigate("/home");
          }
          break;

        case "comment":
          if (notification.related_id) {
            await resolveCommentPostId(notification.related_id);
            return; // resolveCommentPostId handles setIsOpen
          } else {
            navigate("/home");
          }
          break;

        case "message":
          if (notification.related_id) {
            await resolveMessageSender(notification.related_id);
            return; // resolveMessageSender handles setIsOpen
          } else {
            navigate("/messaging");
          }
          break;

        case "event":
          if (notification.related_id) {
            navigate(`/events/${notification.related_id}`);
          } else {
            navigate("/events");
          }
          break;

        case "club":
          navigate("/clubs");
          break;

        case "project":
          navigate("/projects");
          break;

        default:
          navigate("/home");
          break;
      }
    } catch (err) {
      console.error("Notification navigation failed", err);
      navigate("/home");
    }

    setIsOpen(false);
  };

  const handleAcceptConnection = (notification: Notification) => {
    if (!notification.related_id) {
      toast({
        title: "Invalid request",
        description: "Missing connection identifier.",
        variant: "destructive",
      });
      return;
    }
    setActiveConnectionActionId(notification.related_id);
    acceptConnectionMutation.mutate({
      connectionId: notification.related_id,
      notificationId: notification.id,
    });
  };

  const handleRejectConnection = (notification: Notification) => {
    if (!notification.related_id) {
      toast({
        title: "Invalid request",
        description: "Missing connection identifier.",
        variant: "destructive",
      });
      return;
    }
    setActiveConnectionActionId(notification.related_id);
    rejectConnectionMutation.mutate({
      connectionId: notification.related_id,
      notificationId: notification.id,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white/60 hover:text-white hover:bg-white/[0.06]">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] flex items-center justify-center rounded-full bg-white/15 text-[10px] font-semibold text-white px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 !bg-[#0c0c0f] border border-white/10 rounded-xl shadow-2xl text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all disabled:opacity-40"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                ) : null}
                Mark read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => clearAllNotificationsMutation.mutate()}
                disabled={clearAllNotificationsMutation.isPending}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all disabled:opacity-40"
                title="Clear all notifications"
              >
                {clearAllNotificationsMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                ) : (
                  <Trash2 className="h-3 w-3 inline mr-1" />
                )}
                Clear all
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-white/40">Failed to load notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="h-10 w-10 mx-auto mb-3 text-white/15" />
              <p className="text-white/40 text-sm">No notifications yet</p>
              <p className="text-xs text-white/25 mt-1">
                You'll see updates here when someone interacts with you
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer ${!notification.read ? "bg-white/[0.03]" : ""
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-base">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-white/80 line-clamp-2 leading-snug">
                            {notification.content}
                          </p>
                          <p className="text-[11px] text-white/30 mt-1">
                            {formatTimestamp(notification.created_at)}
                          </p>
                          {notification.type === "connection" && notification.related_id ? (() => {
                            const connection = connectionStatusById[notification.related_id];
                            const canRespond =
                              connection?.status === "pending" &&
                              connection?.receiver_id === userId;

                            if (!canRespond) return null;

                            const isBusy =
                              acceptConnectionMutation.isPending ||
                              rejectConnectionMutation.isPending ||
                              activeConnectionActionId === notification.related_id;

                            return (
                              <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                  className="px-3 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all disabled:opacity-40"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleAcceptConnection(notification);
                                  }}
                                  disabled={isBusy}
                                >
                                  {isBusy ? "Processing..." : "Accept"}
                                </button>
                                <button
                                  className="px-3 py-1 rounded-md text-xs font-medium bg-transparent text-white/40 border border-white/10 hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-40"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRejectConnection(notification);
                                  }}
                                  disabled={isBusy}
                                >
                                  Ignore
                                </button>
                              </div>
                            );
                          })() : null}
                        </div>

                        <div className="flex gap-0.5 flex-shrink-0">
                          {!notification.read && (
                            <button
                              className="h-7 w-7 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              disabled={markAsReadMutation.isPending}
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            className="h-7 w-7 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                            title="Delete notification"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
