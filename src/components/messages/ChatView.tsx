import { useRef, useEffect } from "react";
import { Send, MoreVertical, UserPlus, Loader2, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Message, MessageUser, isUserOnline } from "@/lib/messages-api";
import { formatDistanceToNow } from "date-fns";

const suggestedResponses = [
  "Thanks for letting me know!",
  "Yes, I'd be interested in learning more.",
  "Could you send me more details?",
];

interface ChatViewProps {
  activePartner: MessageUser;
  messages: Message[];
  isLoadingMessages: boolean;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isSending: boolean;
  profileId: string;
  onBack: () => void;
  onViewProfile: () => void;
}

const ChatView = ({
  activePartner,
  messages,
  isLoadingMessages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onKeyPress,
  isSending,
  profileId,
  onBack,
  onViewProfile,
}: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestedResponse = (response: string) => {
    onNewMessageChange(response);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#000000] min-w-0 min-h-0">
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-white/[0.04] flex items-center gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0 h-10 w-10 text-white hover:bg-white/[0.06]"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={activePartner.avatar_url || undefined} />
          <AvatarFallback className="bg-white/[0.08] text-white/70 text-xs font-semibold">
            {activePartner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate text-white font-['Space_Grotesk']">{activePartner.full_name}</div>
          <div className="text-xs text-white/40">
            {isUserOnline(activePartner.last_seen) ? "Online" : "Offline"}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-white/60 hover:bg-white/[0.06] hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="!bg-[#0a0a0a] border-white/10 text-white">
            <DropdownMenuItem onClick={onViewProfile} className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.06]">
              <UserPlus className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400/70 focus:text-red-400 focus:bg-white/[0.06]">
              Block Contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-transparent px-5 py-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-white/30" />
            </div>
          ) : (
            <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.sender_id === profileId;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? "bg-white/[0.10]"
                        : "bg-white/[0.06]"
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words text-white">{message.content}</p>
                    <span className={`block text-[10px] mt-1 text-white/35 ${isOwn ? 'text-right' : ''}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick reply suggestions */}
      <div className="px-5 py-3 border-t border-white/10 bg-[#000000] hidden md:block">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-white/35 py-1 flex-shrink-0">Quick Replies:</span>
          {suggestedResponses.map((response, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="whitespace-nowrap text-xs bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white/80"
              onClick={() => handleSuggestedResponse(response)}
            >
              <span className="truncate">{response}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="px-5 py-4 border-t border-white/10 bg-[#000000] flex-shrink-0">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/10">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 min-w-0 w-0 bg-transparent border-0 text-sm text-white placeholder:text-white/40 outline-none"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyDown={onKeyPress}
          />
          <Button
            className="bg-white/10 hover:bg-white/15 border border-white/15 text-white h-9 w-9 flex-shrink-0 rounded-lg"
            size="icon"
            onClick={onSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
