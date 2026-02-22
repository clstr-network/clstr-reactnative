import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  role: 'student' | 'alumni';
  department: string;
  gradYear: string;
  connections: number;
  posts: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  liked: boolean;
  image?: string;
}

export interface Connection {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  status: 'connected' | 'pending' | 'none';
}

export interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  attendees: number;
  category: string;
  rsvpd: boolean;
}

const CURRENT_USER: User = {
  id: 'current-user',
  name: 'Alex Chen',
  username: 'alexchen',
  avatar: '',
  bio: 'CS Senior | Building cool things | Open to mentorship',
  role: 'student',
  department: 'Computer Science',
  gradYear: '2026',
  connections: 47,
  posts: 12,
};

const SEED_USERS: Connection[] = [
  { id: 'u1', name: 'Sarah Mitchell', avatar: '', role: 'Alumni - SWE at Google', department: 'Computer Science', status: 'connected' },
  { id: 'u2', name: 'James Park', avatar: '', role: 'Alumni - PM at Meta', department: 'Information Systems', status: 'connected' },
  { id: 'u3', name: 'Priya Sharma', avatar: '', role: 'Student - Junior', department: 'Data Science', status: 'pending' },
  { id: 'u4', name: 'Marcus Johnson', avatar: '', role: 'Alumni - Founder at TechCo', department: 'Business', status: 'none' },
  { id: 'u5', name: 'Emily Rodriguez', avatar: '', role: 'Student - Senior', department: 'Computer Science', status: 'none' },
  { id: 'u6', name: 'David Kim', avatar: '', role: 'Alumni - DS at Netflix', department: 'Statistics', status: 'none' },
  { id: 'u7', name: 'Olivia Taylor', avatar: '', role: 'Student - Sophomore', department: 'Design', status: 'connected' },
  { id: 'u8', name: 'Ryan Chen', avatar: '', role: 'Alumni - CTO at StartupX', department: 'Computer Science', status: 'none' },
];

const SEED_POSTS: Post[] = [
  {
    id: 'p1', userId: 'u1', userName: 'Sarah Mitchell', userAvatar: '', userRole: 'SWE at Google',
    content: 'Just wrapped up an amazing mentorship session with CS juniors. The talent at our alma mater is incredible! Remember, your network is your net worth.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), likes: 24, comments: 5, liked: false,
  },
  {
    id: 'p2', userId: 'u2', userName: 'James Park', userAvatar: '', userRole: 'PM at Meta',
    content: 'Excited to announce that our alumni chapter is hosting a career fair next month! Open to all students. DM me for early access passes.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), likes: 42, comments: 12, liked: true,
  },
  {
    id: 'p3', userId: 'u4', userName: 'Marcus Johnson', userAvatar: '', userRole: 'Founder at TechCo',
    content: 'Looking for student interns with experience in React Native and TypeScript. Fully remote, competitive pay. Apply through the campus portal or reach out directly.',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), likes: 67, comments: 23, liked: false,
  },
  {
    id: 'p4', userId: 'u7', userName: 'Olivia Taylor', userAvatar: '', userRole: 'Design Student',
    content: 'Just finished my UX case study on campus navigation apps. Would love feedback from any alumni in the design field!',
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(), likes: 15, comments: 8, liked: false,
  },
  {
    id: 'p5', userId: 'u6', userName: 'David Kim', userAvatar: '', userRole: 'DS at Netflix',
    content: 'Sharing my journey from campus data science club president to Netflix. The key? Never stop learning and always ship projects. Happy to chat with anyone interested.',
    timestamp: new Date(Date.now() - 1000 * 60 * 1200).toISOString(), likes: 89, comments: 31, liked: true,
  },
];

const SEED_CONVERSATIONS: Conversation[] = [
  { id: 'c1', partnerId: 'u1', partnerName: 'Sarah Mitchell', partnerAvatar: '', lastMessage: 'Thanks for the advice on the interview prep!', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), unread: 2 },
  { id: 'c2', partnerId: 'u2', partnerName: 'James Park', partnerAvatar: '', lastMessage: 'Sure, I can share my PM transition guide', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), unread: 0 },
  { id: 'c3', partnerId: 'u7', partnerName: 'Olivia Taylor', partnerAvatar: '', lastMessage: 'Hey! Want to collaborate on the hackathon?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), unread: 1 },
];

const SEED_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', senderId: 'u1', text: 'Hey Alex! How did the Google interview go?', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: 'm2', conversationId: 'c1', senderId: 'current-user', text: 'It went well! Your mock interview tips really helped.', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: 'm3', conversationId: 'c1', senderId: 'u1', text: 'That\'s great to hear! Let me know if you need any more help.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'm4', conversationId: 'c1', senderId: 'current-user', text: 'Thanks for the advice on the interview prep!', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  ],
  c2: [
    { id: 'm5', conversationId: 'c2', senderId: 'current-user', text: 'Hi James! I was wondering about transitioning from engineering to PM', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
    { id: 'm6', conversationId: 'c2', senderId: 'u2', text: 'Great question! I made that transition 3 years ago.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString() },
    { id: 'm7', conversationId: 'c2', senderId: 'u2', text: 'Sure, I can share my PM transition guide', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  ],
  c3: [
    { id: 'm8', conversationId: 'c3', senderId: 'u7', text: 'Hey! Want to collaborate on the hackathon?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  ],
};

const SEED_EVENTS: Event[] = [
  { id: 'e1', title: 'Alumni Career Fair 2026', description: 'Connect with top companies and alumni mentors. Bring your resume and portfolio!', date: '2026-03-15', time: '10:00 AM - 4:00 PM', location: 'Student Center Hall A', organizer: 'Career Services', attendees: 234, category: 'Career', rsvpd: true },
  { id: 'e2', title: 'Tech Talk: AI in Production', description: 'Learn how leading companies deploy AI at scale. Featuring speakers from Google, Meta, and Netflix.', date: '2026-03-08', time: '6:00 PM - 8:00 PM', location: 'Engineering Auditorium', organizer: 'CS Department', attendees: 156, category: 'Tech', rsvpd: false },
  { id: 'e3', title: 'Startup Pitch Night', description: 'Student and alumni founders pitch their startups to a panel of VCs and angel investors.', date: '2026-03-22', time: '7:00 PM - 9:30 PM', location: 'Innovation Hub', organizer: 'Entrepreneurship Club', attendees: 89, category: 'Startup', rsvpd: false },
  { id: 'e4', title: 'Design Workshop: Figma to Code', description: 'Hands-on workshop turning Figma designs into production React components.', date: '2026-04-01', time: '2:00 PM - 5:00 PM', location: 'Design Lab 201', organizer: 'Design Society', attendees: 45, category: 'Workshop', rsvpd: true },
  { id: 'e5', title: 'Alumni Networking Mixer', description: 'Casual networking event with alumni from tech, finance, and consulting. Free food and drinks!', date: '2026-04-10', time: '5:30 PM - 8:00 PM', location: 'Rooftop Lounge', organizer: 'Alumni Association', attendees: 120, category: 'Networking', rsvpd: false },
];

interface DataContextValue {
  currentUser: User;
  posts: Post[];
  connections: Connection[];
  conversations: Conversation[];
  events: Event[];
  getMessages: (conversationId: string) => Message[];
  toggleLike: (postId: string) => void;
  addPost: (content: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  toggleRSVP: (eventId: string) => void;
  sendConnectionRequest: (userId: string) => void;
  acceptConnection: (userId: string) => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const STORAGE_KEYS = {
  POSTS: 'clstr_posts',
  CONNECTIONS: 'clstr_connections',
  CONVERSATIONS: 'clstr_conversations',
  MESSAGES: 'clstr_messages',
  EVENTS: 'clstr_events',
  INITIALIZED: 'clstr_initialized',
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        setPosts(SEED_POSTS);
        setConnections(SEED_USERS);
        setConversations(SEED_CONVERSATIONS);
        setMessages(SEED_MESSAGES);
        setEvents(SEED_EVENTS);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.POSTS, JSON.stringify(SEED_POSTS)],
          [STORAGE_KEYS.CONNECTIONS, JSON.stringify(SEED_USERS)],
          [STORAGE_KEYS.CONVERSATIONS, JSON.stringify(SEED_CONVERSATIONS)],
          [STORAGE_KEYS.MESSAGES, JSON.stringify(SEED_MESSAGES)],
          [STORAGE_KEYS.EVENTS, JSON.stringify(SEED_EVENTS)],
          [STORAGE_KEYS.INITIALIZED, 'true'],
        ]);
      } else {
        const [p, c, cv, m, e] = await AsyncStorage.multiGet([
          STORAGE_KEYS.POSTS,
          STORAGE_KEYS.CONNECTIONS,
          STORAGE_KEYS.CONVERSATIONS,
          STORAGE_KEYS.MESSAGES,
          STORAGE_KEYS.EVENTS,
        ]);
        setPosts(p[1] ? JSON.parse(p[1]) : SEED_POSTS);
        setConnections(c[1] ? JSON.parse(c[1]) : SEED_USERS);
        setConversations(cv[1] ? JSON.parse(cv[1]) : SEED_CONVERSATIONS);
        setMessages(m[1] ? JSON.parse(m[1]) : SEED_MESSAGES);
        setEvents(e[1] ? JSON.parse(e[1]) : SEED_EVENTS);
      }
    } catch {
      setPosts(SEED_POSTS);
      setConnections(SEED_USERS);
      setConversations(SEED_CONVERSATIONS);
      setMessages(SEED_MESSAGES);
      setEvents(SEED_EVENTS);
    }
    setIsLoading(false);
  };

  const saveState = useCallback(async (key: string, data: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }, []);

  const toggleLike = useCallback((postId: string) => {
    setPosts(prev => {
      const updated = prev.map(p =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      );
      saveState(STORAGE_KEYS.POSTS, updated);
      return updated;
    });
  }, [saveState]);

  const addPost = useCallback((content: string) => {
    const newPost: Post = {
      id: Crypto.randomUUID(),
      userId: CURRENT_USER.id,
      userName: CURRENT_USER.name,
      userAvatar: '',
      userRole: `${CURRENT_USER.role} - ${CURRENT_USER.department}`,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      liked: false,
    };
    setPosts(prev => {
      const updated = [newPost, ...prev];
      saveState(STORAGE_KEYS.POSTS, updated);
      return updated;
    });
  }, [saveState]);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    const newMsg: Message = {
      id: Crypto.randomUUID(),
      conversationId,
      senderId: CURRENT_USER.id,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => {
      const convMsgs = prev[conversationId] || [];
      const updated = { ...prev, [conversationId]: [...convMsgs, newMsg] };
      saveState(STORAGE_KEYS.MESSAGES, updated);
      return updated;
    });
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: text, timestamp: new Date().toISOString(), unread: 0 }
          : c
      );
      saveState(STORAGE_KEYS.CONVERSATIONS, updated);
      return updated;
    });
  }, [saveState]);

  const toggleRSVP = useCallback((eventId: string) => {
    setEvents(prev => {
      const updated = prev.map(e =>
        e.id === eventId
          ? { ...e, rsvpd: !e.rsvpd, attendees: e.rsvpd ? e.attendees - 1 : e.attendees + 1 }
          : e
      );
      saveState(STORAGE_KEYS.EVENTS, updated);
      return updated;
    });
  }, [saveState]);

  const sendConnectionRequest = useCallback((userId: string) => {
    setConnections(prev => {
      const updated = prev.map(c =>
        c.id === userId ? { ...c, status: 'pending' as const } : c
      );
      saveState(STORAGE_KEYS.CONNECTIONS, updated);
      return updated;
    });
  }, [saveState]);

  const acceptConnection = useCallback((userId: string) => {
    setConnections(prev => {
      const updated = prev.map(c =>
        c.id === userId ? { ...c, status: 'connected' as const } : c
      );
      saveState(STORAGE_KEYS.CONNECTIONS, updated);
      return updated;
    });
  }, [saveState]);

  const getMessages = useCallback((conversationId: string) => {
    return messages[conversationId] || [];
  }, [messages]);

  const value = useMemo(() => ({
    currentUser: CURRENT_USER,
    posts,
    connections,
    conversations,
    events,
    getMessages,
    toggleLike,
    addPost,
    sendMessage,
    toggleRSVP,
    sendConnectionRequest,
    acceptConnection,
    isLoading,
  }), [posts, connections, conversations, events, getMessages, toggleLike, addPost, sendMessage, toggleRSVP, sendConnectionRequest, acceptConnection, isLoading]);

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
