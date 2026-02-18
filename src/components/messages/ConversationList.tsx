import { Search, Loader2, Users, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Conversation, MessageUser, isUserOnline } from "@/lib/messages-api";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  connectedUsers: MessageUser[];
  filteredConnections: MessageUser[];
  connectionsWithoutConversations: MessageUser[];
  activePartnerId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: "conversations" | "connections";
  onTabChange: (tab: "conversations" | "connections") => void;
  onSelectConversation: (conv: Conversation) => void;
  onSelectConnection: (user: MessageUser) => void;
  isLoadingConversations: boolean;
  isLoadingConnections: boolean;
  isHidden: boolean;
  onNavigateToNetwork: () => void;
}

const ConversationList = ({
  conversations,
  filteredConversations,
  connectedUsers,
  filteredConnections,
  connectionsWithoutConversations,
  activePartnerId,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onSelectConversation,
  onSelectConnection,
  isLoadingConversations,
  isLoadingConnections,
  isHidden,
  onNavigateToNetwork,
}: ConversationListProps) => {
  return (
    <div className={`w-full lg:w-[380px] border-r border-white/10 flex flex-col bg-[#000000] overflow-hidden min-w-0 max-w-full ${isHidden ? 'hidden md:flex' : 'flex'}`}>
      {/* Search Header */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10 bg-[#000000] flex-shrink-0">
        <h2 className="text-2xl font-bold mb-4 text-white font-['Space_Grotesk']">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-10 h-10 bg-white/[0.06] border-white/10 text-white placeholder:text-white/40 rounded-xl focus:ring-white/20 focus:border-white/20"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs for Conversations and Connections */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "conversations" | "connections")} className="flex-1 flex flex-col min-h-0">
        <div className="px-5 pt-3 pb-3 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-2 bg-white/[0.04] border border-white/10 rounded-2xl p-1 h-auto">
            <TabsTrigger value="conversations" className="text-xs md:text-sm rounded-xl data-[state=active]:bg-white/[0.10] data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:text-white data-[state=active]:shadow-none text-white/50 font-['Space_Grotesk'] py-2">
              Chats {conversations.length > 0 && <span className="text-white/40 ml-1">({conversations.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="connections" className="text-xs md:text-sm rounded-xl data-[state=active]:bg-white/[0.10] data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:text-white data-[state=active]:shadow-none text-white/50 font-['Space_Grotesk'] py-2">
              Contacts {connectedUsers.length > 0 && <span className="text-white/40 ml-1">({connectedUsers.length})</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="flex-1 mt-0 h-full">
          <div className="h-full overflow-y-auto px-5 pt-2 pb-4 space-y-2 max-w-full overflow-x-hidden">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <Users className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/50 text-sm font-['Space_Grotesk']">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                {!searchQuery && connectionsWithoutConversations.length > 0 && (
                  <Button
                    variant="link"
                    className="mt-2 text-sm text-white/50 hover:text-white/70"
                    onClick={() => onTabChange("connections")}
                  >
                    Start chatting with your connections
                  </Button>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isOnline = isUserOnline(conversation.partner.last_seen);
                const isActive = activePartnerId === conversation.partner.id;
                const hasUnread = conversation.unreadCount > 0;
                return (
                  <button
                    key={conversation.partner.id}
                    className={`w-full p-3 rounded-xl transition-colors text-left border overflow-hidden ${
                      isActive
                        ? "bg-white/[0.10] border-white/15"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
                    }`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative flex-shrink-0 min-w-[44px]">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={conversation.partner.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-white/[0.08] text-white/70">
                            {conversation.partner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-white/40 ring-2 ring-[#000000]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-0.5 gap-2">
                          <span className="font-medium text-sm truncate min-w-0 font-['Space_Grotesk'] text-white">{conversation.partner.full_name}</span>
                          <span className="text-xs text-white/40 flex-shrink-0 whitespace-nowrap">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: false })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <p className={`text-xs truncate min-w-0 ${hasUnread ? 'text-white/60' : 'text-white/50'}`}>{conversation.lastMessage.content}</p>
                          {hasUnread && (
                            <span className="h-2 w-2 rounded-full bg-white/40 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="flex-1 mt-0 h-full">
          <div className="h-full overflow-y-auto px-5 pt-2 pb-4 space-y-2 max-w-full overflow-x-hidden">
            {isLoadingConnections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <UserPlus className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/50 text-sm font-['Space_Grotesk']">
                  {searchQuery ? "No contacts found" : "No connections yet"}
                </p>
                {!searchQuery && (
                  <Button
                    variant="link"
                    className="mt-2 text-sm text-white/50 hover:text-white/70"
                    onClick={onNavigateToNetwork}
                  >
                    Find people to connect with
                  </Button>
                )}
              </div>
            ) : (
              filteredConnections.map((user) => {
                const isOnline = isUserOnline(user.last_seen);
                const hasConversation = conversations.some((c) => c.partner.id === user.id);
                return (
                  <button
                    key={user.id}
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors text-left overflow-hidden"
                    onClick={() => onSelectConnection(user)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative flex-shrink-0 min-w-[44px]">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-white/[0.08] text-white/70">
                            {user.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-white/40 ring-2 ring-[#000000]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <span className="font-medium text-sm truncate block text-white font-['Space_Grotesk']">{user.full_name}</span>
                        <span className="text-xs text-white/40 block truncate">
                          {isOnline ? "Online" : "Offline"}
                          {hasConversation && " · Has messages"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversationList;
