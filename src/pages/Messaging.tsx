import { useState, useEffect, useMemo, useCallback } from "react";
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  markMessagesAsRead,
  subscribeToMessages,
  updateLastSeen,
  getConnectedUsers,
  assertCanMessagePartner,
  Conversation,
  MessageUser,
} from "@/lib/messages-api";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import { useIsMobile } from "@/hooks/use-mobile";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";

const Messaging = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<MessageUser | null>(null);
  const [partnerHandled, setPartnerHandled] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversations" | "connections">("conversations");
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const partnerIdFromUrl = searchParams.get("partner") ?? searchParams.get("user");
  const activePartnerId = selectedConversation?.partner.id ?? selectedPartner?.id ?? null;
  const activePartner = selectedConversation?.partner ?? selectedPartner;

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: QUERY_KEYS.social.conversations(profile?.id),
    queryFn: () => getConversations(profile?.id),
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  // Fetch connected users (for showing contacts that don't have conversations yet)
  const { data: connectedUsers = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: QUERY_KEYS.social.connectedUsers(),
    queryFn: () => getConnectedUsers(profile?.id),
    enabled: !!profile?.id,
    staleTime: 60000,
  });

  // Compute connections that don't have active conversations
  const connectionsWithoutConversations = useMemo(() => {
    const conversationPartnerIds = new Set(conversations.map((c) => c.partner.id));
    return connectedUsers.filter((user) => !conversationPartnerIds.has(user.id));
  }, [conversations, connectedUsers]);

  useEffect(() => {
    if (!selectedConversation) return;
    const refreshed = conversations.find((conv) => conv.partner.id === selectedConversation.partner.id);
    if (refreshed) {
      setSelectedConversation(refreshed);
    }
  }, [conversations, selectedConversation, selectedConversation?.partner.id]);

  useEffect(() => {
    if (!selectedPartner?.id) return;

    let mounted = true;
    const channel = supabase
      .channel(CHANNELS.social.messagingPartner(selectedPartner.id))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${selectedPartner.id}` },
        async () => {
          try {
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, last_seen')
              .eq('id', selectedPartner.id)
              .maybeSingle();

            if (!mounted || !partnerProfile) return;

            setSelectedPartner({
              id: partnerProfile.id,
              full_name: partnerProfile.full_name || 'Unknown User',
              avatar_url: partnerProfile.avatar_url || '',
              last_seen: partnerProfile.last_seen || undefined,
            });
          } catch (err) {
            if (mounted) {
              console.error('Failed to refresh partner profile:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedPartner?.id]);

  // Handle partner query param from Profile page Message button
  useEffect(() => {
    if (!partnerIdFromUrl || partnerHandled || isLoadingConversations) return;

    assertValidUuid(partnerIdFromUrl, "partnerId");

    // Look for existing conversation with this partner
    const existingConversation = conversations.find(
      (conv) => conv.partner.id === partnerIdFromUrl
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setSelectedPartner(null);
      setPartnerHandled(true);
      setSearchParams({}, { replace: true });
    } else if (!isLoadingConversations) {
      const selectPartner = async () => {
        await assertCanMessagePartner(partnerIdFromUrl, profile?.id);

        const { data: partnerProfile, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, last_seen")
          .eq("id", partnerIdFromUrl)
          .maybeSingle();

        if (error || !partnerProfile) {
          throw new Error("Failed to load partner profile");
        }

        setSelectedConversation(null);
        setSelectedPartner({
          id: partnerProfile.id,
          full_name: partnerProfile.full_name || "Unknown User",
          avatar_url: partnerProfile.avatar_url || "",
          last_seen: partnerProfile.last_seen || undefined,
        });
        setPartnerHandled(true);
        setSearchParams({}, { replace: true });
      };

      selectPartner().catch((err) => {
        console.error("Failed to select partner from URL:", err);
        toast({
          title: "Error",
          description: "Could not load the user profile",
          variant: "destructive",
        });
        setPartnerHandled(true);
        setSearchParams({}, { replace: true });
      });
    }
  }, [partnerIdFromUrl, conversations, partnerHandled, isLoadingConversations, setSearchParams, profile?.id]);

  // Auto-select first conversation on load (only if no partner param)
  useEffect(() => {
    // On mobile, showing the inbox by default is preferable; selecting a conversation
    // immediately would hide the inbox pane.
    if (isMobile) return;

    if (conversations.length > 0 && !activePartnerId && !partnerIdFromUrl) {
      setSelectedConversation(conversations[0]);
      setSelectedPartner(null);
    }
  }, [conversations, activePartnerId, partnerIdFromUrl, isMobile]);

  // Fetch messages for selected conversation
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: QUERY_KEYS.social.messages(activePartnerId),
    queryFn: () => getMessages(activePartnerId!, 50),
    enabled: !!activePartnerId,
  });

  const messages = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);

  const invalidateUnread = useCallback(() => {
    if (profile?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.unreadMessageCount(profile.id) });
    }
  }, [profile?.id, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activePartnerId) throw new Error("No conversation selected");
      return sendMessageApi(activePartnerId, content);
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.messages(activePartnerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile?.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.connectedUsers() });
      invalidateUnread();
    },
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!profile?.id) return;

    const unsubscribe = subscribeToMessages(profile.id, (newMessage) => {
      // Optimistically update the conversations cache instead of full refetch.
      queryClient.setQueryData<Conversation[]>(
        ["conversations", profile.id],
        (old) => {
          if (!old) {
            // No cache yet Ã¢â‚¬â€ force a full fetch
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile.id) });
            return old;
          }

          const partnerId =
            newMessage.sender_id === profile.id
              ? newMessage.receiver_id
              : newMessage.sender_id;
          const existing = old.find((c) => c.partner.id === partnerId);

          if (existing) {
            return old.map((c) => {
              if (c.partner.id !== partnerId) return c;
              const isIncoming = newMessage.receiver_id === profile.id;
              return {
                ...c,
                lastMessage: newMessage,
                unreadCount: isIncoming && !newMessage.read
                  ? c.unreadCount + 1
                  : c.unreadCount,
              };
            }).sort((a, b) =>
              new Date(b.lastMessage.created_at).getTime() -
              new Date(a.lastMessage.created_at).getTime()
            );
          }

          // New conversation partner Ã¢â‚¬â€ need to refetch to get profile info
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile.id) });
          return old;
        }
      );

      invalidateUnread();

      if (!activePartnerId) return;
      if (newMessage.sender_id === activePartnerId || newMessage.receiver_id === activePartnerId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.messages(activePartnerId) });
      }

      if (newMessage.receiver_id === profile.id && newMessage.sender_id === activePartnerId) {
        markMessagesAsRead(activePartnerId).finally(() => {
          invalidateUnread();
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile.id) });
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.id, queryClient, invalidateUnread, activePartnerId]);

  // Update last seen periodically
  useEffect(() => {
    if (!profile?.id) return;

    updateLastSeen(profile.id);
    const interval = setInterval(() => {
      updateLastSeen(profile.id);
    }, 60000);

    return () => clearInterval(interval);
  }, [profile?.id]);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (!activePartnerId) return;
    markMessagesAsRead(activePartnerId).finally(() => {
      invalidateUnread();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile?.id) });
    });
  }, [activePartnerId, invalidateUnread, queryClient, profile?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activePartnerId) return;

    const content = newMessage.trim();
    setNewMessage("");
    await sendMessageMutation.mutateAsync(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedPartner(null);
  };

  const handleSelectConnection = (user: MessageUser) => {
    // Check if there's an existing conversation with this user
    const existingConvo = conversations.find((c) => c.partner.id === user.id);
    if (existingConvo) {
      setSelectedConversation(existingConvo);
      setSelectedPartner(null);
    } else {
      setSelectedConversation(null);
      setSelectedPartner(user);
    }
    setActiveTab("conversations");
  };

  const handleViewProfile = () => {
    if (activePartner) {
      navigate(`/profile/${activePartner.id}`);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSelectedPartner(null);
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.partner.full_name.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Filter connections based on search
  const filteredConnections = useMemo(() => {
    const allConnections = [...connectedUsers];
    if (!searchQuery.trim()) return allConnections;
    const query = searchQuery.toLowerCase();
    return allConnections.filter((user) =>
      user.full_name.toLowerCase().includes(query)
    );
  }, [connectedUsers, searchQuery]);

  if (!profile?.id) {
    return (
      <div className="home-theme flex items-center justify-center h-[calc(100vh-56px-64px)] md:h-[calc(100vh-80px)] px-4 bg-[#000000]">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <p className="text-white/50 font-['Space_Grotesk']">Please log in to view messages.</p>
          <Button className="mt-4 bg-white/10 border border-white/15 text-white hover:bg-white/15" onClick={() => navigate("/login")}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-theme h-[calc(100vh-56px-64px)] md:h-[calc(100vh-80px)] flex flex-col bg-[#000000] overflow-hidden">
      <div className="flex-1 flex overflow-hidden w-full max-w-full">
        {/* Conversation List */}
        <ConversationList
          conversations={conversations}
          filteredConversations={filteredConversations}
          connectedUsers={connectedUsers}
          filteredConnections={filteredConnections}
          connectionsWithoutConversations={connectionsWithoutConversations}
          activePartnerId={activePartnerId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onSelectConversation={handleSelectConversation}
          onSelectConnection={handleSelectConnection}
          isLoadingConversations={isLoadingConversations}
          isLoadingConnections={isLoadingConnections}
          isHidden={!!activePartner}
          onNavigateToNetwork={() => navigate("/network")}
        />

        {/* Chat View */}
        <div className={`flex-1 flex flex-col bg-[#000000] min-w-0 min-h-0 ${!activePartner ? 'hidden md:flex' : 'flex'}`}>
          {activePartner ? (
            <ChatView
              activePartner={activePartner}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              onKeyPress={handleKeyPress}
              isSending={sendMessageMutation.isPending}
              profileId={profile.id}
              onBack={handleBack}
              onViewProfile={handleViewProfile}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <Users className="h-16 w-16 mx-auto text-white/15 mb-4" />
                <p className="text-white/50 text-lg mb-2 font-['Space_Grotesk']">Select a conversation</p>
                <p className="text-white/35 text-sm">Choose a chat from the list or start a new conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;
