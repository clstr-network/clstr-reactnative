/**
 * AIChatbot — Persisted AI Career Assistant.
 *
 * Chat sessions and messages are stored in Supabase via ai_chat_sessions
 * and ai_chat_messages tables. Realtime subscription keeps UI in sync.
 *
 * AI is advisory only — career guidance, networking tips, interview prep.
 * AI NEVER: modifies identity, creates invites, overrides DB rules.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIChatSessions, useAIChatMessages } from "@/hooks/useAIChat";
import type { AIChatMessage } from "@/types/ai";

// ============================================================================
// Suggested prompts for career assistance
// ============================================================================

const SUGGESTED_PROMPTS = [
  "How can I improve my resume?",
  "Tips for networking at alumni events",
  "Career transition advice",
  "How to prepare for interviews?",
];

// ============================================================================
// Component
// ============================================================================

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sessions, createSession, isCreating } = useAIChatSessions();
  const { messages, isSending, sendMessage, clearChat } = useAIChatMessages(activeSessionId);

  // Auto-select the most recent session or create one when chat opens
  useEffect(() => {
    if (isOpen && !activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [isOpen, activeSessionId, sessions]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Ensure we have a session before sending
  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const session = await createSession();
    setActiveSessionId(session.id);
    return session.id;
  }, [activeSessionId, createSession]);

  // Send message to AI (persisted to Supabase)
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;
    setError(null);

    try {
      await ensureSession();
      await sendMessage(content);
    } catch {
      setError("Connection failed. Please check your network and try again.");
    }
  }, [isSending, ensureSession, sendMessage]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputValue;
    setInputValue("");
    handleSend(value);
  };

  // Handle suggested prompt click
  const handleSuggestedPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  // Clear chat history (deletes session from DB, creates new one)
  const handleClearChat = useCallback(async () => {
    await clearChat();
    setActiveSessionId(null);
    setError(null);
  }, [clearChat]);

  // Format timestamp from DB string
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
            isOpen
              ? "bg-white/[0.15] hover:bg-white/[0.15]"
              : "bg-white/10 hover:bg-white/[0.15]"
          )}
          aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-white/10 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-white/10 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-white" />
              <h3 className="font-medium text-white">AI Career Assistant</h3>
            </div>
            <div className="flex items-center space-x-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/[0.10]"
                  onClick={handleClearChat}
                  title="Clear chat"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/[0.10]"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {messages.length === 0 ? (
              /* Welcome state with suggested prompts */
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="bg-white/[0.06] p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Bot className="h-6 w-6 text-white/60" />
                  </div>
                  <h4 className="font-semibold text-white">
                    Hi! I'm your Career Assistant
                  </h4>
                  <p className="text-sm text-white/60 mt-1">
                    Ask me anything about career growth, networking, or professional development.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-white/60 font-medium">Try asking:</p>
                  {SUGGESTED_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="w-full text-left text-sm p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat messages */
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                          message.error
                            ? "bg-red-100"
                            : "bg-white/[0.06]"
                        )}
                      >
                        {message.error ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Bot className="h-4 w-4 text-white/60" />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg p-3",
                        message.role === "user"
                          ? "bg-white/10 text-white"
                          : message.error
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-white/[0.06] text-white"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1 opacity-70",
                          message.role === "user" ? "text-right" : "text-left"
                        )}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-white/60" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isSending && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-white/60" />
                    </div>
                    <div className="bg-white/[0.06] rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                        <span className="text-sm text-white/60">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t bg-white/[0.04] shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about career advice..."
                disabled={isSending}
                className="flex-1 text-sm"
                maxLength={500}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isSending}
                className="bg-white/10 hover:bg-white/[0.15] shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
