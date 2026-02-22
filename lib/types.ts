/**
 * @deprecated — MOCK TYPES. Use types from @clstr/core/types instead.
 * Will be removed once all screens are migrated.
 */
export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  role: string;
  connections: number;
  posts: number;
  joined: string;
  isOnline: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  tag?: string;
}

export interface Conversation {
  id: string;
  participantName: string;
  participantHandle: string;
  participantAvatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isOnline: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
}

export interface Connection {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  mutual: number;
  status: 'connected' | 'pending' | 'none';
  isOnline: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'connection' | 'event' | 'message';
  actorName: string;
  actorAvatar: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}
