/**
 * @deprecated — MOCK LAYER. Will be removed once all screens migrate to
 * lib/api/* + React Query. Do NOT add new consumers.
 */
import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { Post, Conversation, Message, Connection, Notification, UserProfile } from './types';
import { currentUser, seedPosts, seedConversations, seedMessages, seedConnections, seedNotifications } from './seed-data';

interface DataContextValue {
  user: UserProfile;
  posts: Post[];
  conversations: Conversation[];
  connections: Connection[];
  notifications: Notification[];
  unreadCount: number;
  toggleLike: (postId: string) => void;
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, text: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateConnectionStatus: (id: string, status: 'connected' | 'pending' | 'none') => void;
  addPost: (content: string, tag?: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [user] = useState<UserProfile>(currentUser);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>(seedMessages);
  const [connections, setConnections] = useState<Connection[]>(seedConnections);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const toggleLike = useCallback((postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  }, []);

  const getMessages = useCallback((conversationId: string) => {
    return messages[conversationId] || [];
  }, [messages]);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'user-self',
      text,
      timestamp: 'Just now',
      isOwn: true,
    };
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, lastMessage: text, timestamp: 'now', unread: 0 }
        : c
    ));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const updateConnectionStatus = useCallback((id: string, status: 'connected' | 'pending' | 'none') => {
    setConnections(prev => prev.map(c =>
      c.id === id ? { ...c, status } : c
    ));
  }, []);

  const addPost = useCallback((content: string, tag?: string) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorHandle: user.handle,
      authorAvatar: user.avatar,
      content,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      isLiked: false,
      tag,
    };
    setPosts(prev => [newPost, ...prev]);
  }, [user]);

  const value = useMemo(() => ({
    user,
    posts,
    conversations,
    connections,
    notifications,
    unreadCount,
    toggleLike,
    getMessages,
    sendMessage,
    markNotificationRead,
    markAllNotificationsRead,
    updateConnectionStatus,
    addPost,
  }), [user, posts, conversations, connections, notifications, unreadCount, toggleLike, getMessages, sendMessage, markNotificationRead, markAllNotificationsRead, updateConnectionStatus, addPost]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
