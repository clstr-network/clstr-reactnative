// Social feature types — cross-platform

interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  expires_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  images?: string[];
  video?: string;
  poll?: Poll;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    headline?: string;
  };
  liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  liked?: boolean;
  replies?: Comment[];
}

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    headline?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    headline?: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'connection' | 'message';
  related_id?: string;
  content: string;
  read: boolean;
  created_at: string;
}
