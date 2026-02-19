import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  X,
  Send,
  Minimize2,
  Search,
  Loader2,
} from "lucide-react";
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  markMessagesAsRead,
  subscribeToMessages,
  updateLastSeen,
  isUserOnline,
  getConnectedUsers,
  Message,
  Conversation,
  MessageUser,
} from "@/lib/messages-api";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface MessagesQueryData {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: QUERY_KEYS.social.conversations(profile?.id),
    queryFn: () => getConversations(profile?.id),
    enabled: isOpen && !!profile?.id,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Fetch messages for selected conversation
  const { 
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages 
  } = useQuery({
    queryKey: QUERY_KEYS.social.messages(selectedConversation?.partner.id),
    queryFn: () => getMessages(selectedConversation!.partner.id, 50),
    enabled: !!selectedConversation?.partner.id,
  });

  const messages = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);
  const hasMoreMessages = messagesData?.hasMore || false;

  useEffect(() => {
    if (!selectedConversation) return;
    const refreshed = conversations.find((conv) => conv.partner.id === selectedConversation.partner.id);
    if (refreshed) {
      setSelectedConversation(refreshed);
    }
  }, [conversations, selectedConversation, selectedConversation?.partner.id]);

  // Send message mutation with optimistic update
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !profile?.id) throw new Error("No conversation selected");
      return sendMessageApi(selectedConversation.partner.id, content);
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.messages(selectedConversation?.partner.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile?.id) });
      if (profile?.id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.unreadMessageCount(profile.id) });
      }
    },
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!profile?.id || !isOpen) return;

    const unsubscribe = subscribeToMessages(profile.id, (newMessage) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.unreadMessageCount(profile.id) });

      if (selectedConversation && (newMessage.sender_id === selectedConversation.partner.id || newMessage.receiver_id === selectedConversation.partner.id)) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.messages(selectedConversation.partner.id) });
      }

      if (selectedConversation && newMessage.receiver_id === profile.id && newMessage.sender_id === selectedConversation.partner.id) {
        markMessagesAsRead(selectedConversation.partner.id).finally(() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile.id) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.unreadMessageCount(profile.id) });
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.id, isOpen, selectedConversation, queryClient, refetchConversations]);

  // Update last seen periodically
  useEffect(() => {
    if (!profile?.id) return;
    
    updateLastSeen(profile.id);
    const interval = setInterval(() => {
      updateLastSeen(profile.id);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [profile?.id]);

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (selectedConversation) {
      markMessagesAsRead(selectedConversation.partner.id).finally(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.conversations(profile?.id) });
        if (profile?.id) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.social.unreadMessageCount(profile.id) });
        }
      });
    }
  }, [selectedConversation, queryClient, profile?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage("");
    await sendMessageMutation.mutateAsync(content);
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const filteredConversations = conversations.filter((conv) =>
    conv.partner.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="hidden md:inline-flex fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-white/10 border border-white/15 hover:bg-white/15 text-white"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-white/30 text-white text-xs">
            {totalUnread > 9 ? "9+" : totalUnread}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div
      className={`hidden md:flex fixed bottom-0 right-6 bg-[#000000] text-white border border-white/10 shadow-2xl rounded-t-lg z-50 flex-col ${
        isMinimized ? "h-14" : "h-[600px]"
      } w-96 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.04] text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-white/60" />
          <h3 className="font-semibold font-['Space_Grotesk']">
            {selectedConversation ? selectedConversation.partner.full_name : "Messages"}
          </h3>
          {totalUnread > 0 && !selectedConversation && (
            <span className="text-xs text-white/40">({totalUnread})</span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!selectedConversation ? (
            // Conversations List
            <>
              <div className="px-4 py-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/[0.06] border-white/10 text-white placeholder:text-white/40 rounded-xl focus:ring-white/20"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-white/20 mb-3" />
                    <p className="text-white/50 text-sm font-['Space_Grotesk']">No conversations yet</p>
                    <p className="text-white/35 text-xs mt-1">
                      Start connecting with alumni!
                    </p>
                  </div>
                ) : (
                  <div className="px-3 pt-2 pb-3 space-y-1.5">
                    {filteredConversations.map((conv) => {
                      const isOnline = isUserOnline(conv.partner.last_seen);
                      return (
                        <button
                          key={conv.partner.id}
                          onClick={() => setSelectedConversation(conv)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-11 w-11">
                              <AvatarImage src={conv.partner.avatar_url || undefined} alt={conv.partner.full_name} className="object-cover" />
                              <AvatarFallback className="text-xs font-semibold bg-white/[0.08] text-white/70">
                                {conv.partner.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-white/40 border-2 border-[#000000] rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 text-left overflow-hidden">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm truncate text-white font-['Space_Grotesk']">
                                {conv.partner.full_name}
                              </h4>
                              <span className="text-xs text-white/40">
                                {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                                  addSuffix: false,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-white/60" : "text-white/50"}`}>
                                {conv.lastMessage.content}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="h-2 w-2 rounded-full bg-white/40 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            // Chat View
            <>
              <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="text-xs text-white/60 hover:text-white hover:bg-white/[0.06] -ml-2"
                >
                  â† Back to conversations
                </Button>
              </div>
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-2">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === profile?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3 ${
                            isOwn
                              ? "bg-white/[0.10]"
                              : "bg-white/[0.06]"
                          }`}
                        >
                          <p className="text-sm text-white leading-relaxed">{message.content}</p>
                          <span className={`block text-xs mt-1 text-white/35 ${isOwn ? 'text-right' : ''}`}>
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="px-4 py-3 border-t border-white/10">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-white/10 border border-white/15 text-white hover:bg-white/15 rounded-lg h-8 w-8 flex-shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
