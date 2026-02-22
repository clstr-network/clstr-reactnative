import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEYS = {
  USER_PROFILE: 'clstr_user_profile',
  POSTS: 'clstr_posts',
  CONNECTIONS: 'clstr_connections',
  MESSAGES: 'clstr_messages',
  CONVERSATIONS: 'clstr_conversations',
  NOTIFICATIONS: 'clstr_notifications',
  ONBOARDING_COMPLETE: 'clstr_onboarding_complete',
  EVENTS: 'clstr_events',
  SAVED_POSTS: 'clstr_saved_posts',
};

export type UserRole = 'student' | 'faculty' | 'alumni';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  bio: string;
  avatarUrl: string;
  graduationYear?: string;
  joinedAt: string;
  connectionsCount: number;
  postsCount: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorRole: UserRole;
  authorAvatar: string;
  content: string;
  category: 'general' | 'academic' | 'events' | 'career' | 'social';
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface Connection {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  department: string;
  avatarUrl: string;
  bio: string;
  status: 'connected' | 'pending' | 'suggested';
  mutualConnections: number;
  postsCount: number;
  connectionsCount: number;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantRole: UserRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'connection' | 'mention' | 'event';
  actorName: string;
  actorAvatar: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetId?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  category: 'academic' | 'social' | 'career' | 'workshop' | 'sports';
  organizerName: string;
  organizerRole: UserRole;
  organizerAvatar: string;
  attendeesCount: number;
  maxAttendees: number;
  isRsvped: boolean;
  imageUrl?: string;
}

function generateId(): string {
  return Crypto.randomUUID();
}

const SAMPLE_AVATARS = [
  'https://i.pravatar.cc/150?img=1',
  'https://i.pravatar.cc/150?img=2',
  'https://i.pravatar.cc/150?img=3',
  'https://i.pravatar.cc/150?img=4',
  'https://i.pravatar.cc/150?img=5',
  'https://i.pravatar.cc/150?img=6',
  'https://i.pravatar.cc/150?img=7',
  'https://i.pravatar.cc/150?img=8',
  'https://i.pravatar.cc/150?img=9',
  'https://i.pravatar.cc/150?img=10',
];

function seedPosts(): Post[] {
  const now = Date.now();
  return [
    {
      id: generateId(),
      authorId: 'user_2',
      authorName: 'Dr. Sarah Chen',
      authorUsername: 'schen',
      authorRole: 'faculty',
      authorAvatar: SAMPLE_AVATARS[1],
      content: 'Excited to announce our new research lab in quantum computing opens next semester. Looking for motivated students to join the team!',
      category: 'academic',
      likesCount: 42,
      commentsCount: 2,
      isLiked: false,
      isSaved: false,
      createdAt: new Date(now - 3600000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_3', authorName: 'Marcus Johnson', authorAvatar: SAMPLE_AVATARS[2], authorRole: 'student', content: 'This is incredible! Where do I sign up?', createdAt: new Date(now - 3000000).toISOString() },
        { id: generateId(), authorId: 'user_5', authorName: 'James Park', authorAvatar: SAMPLE_AVATARS[4], authorRole: 'student', content: 'Count me in! Quantum computing has always fascinated me.', createdAt: new Date(now - 2400000).toISOString() },
      ],
    },
    {
      id: generateId(),
      authorId: 'user_3',
      authorName: 'Marcus Johnson',
      authorUsername: 'mjohnson',
      authorRole: 'student',
      authorAvatar: SAMPLE_AVATARS[2],
      content: 'Just wrapped up an amazing hackathon weekend! Our team built an AI-powered campus navigation app. Shoutout to everyone who participated.',
      category: 'social',
      likesCount: 89,
      commentsCount: 1,
      isLiked: true,
      isSaved: false,
      createdAt: new Date(now - 7200000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_7', authorName: 'Alex Kim', authorAvatar: SAMPLE_AVATARS[6], authorRole: 'alumni', content: 'Love seeing this energy! The hackathon tradition lives on.', createdAt: new Date(now - 6000000).toISOString() },
      ],
    },
    {
      id: generateId(),
      authorId: 'user_4',
      authorName: 'Priya Patel',
      authorUsername: 'ppatel',
      authorRole: 'alumni',
      authorAvatar: SAMPLE_AVATARS[3],
      content: 'Hiring for summer internships at our startup! We are looking for CS and Design students. DM me for details.',
      category: 'career',
      likesCount: 156,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      createdAt: new Date(now - 14400000).toISOString(),
      comments: [],
    },
    {
      id: generateId(),
      authorId: 'user_5',
      authorName: 'James Park',
      authorUsername: 'jpark',
      authorRole: 'student',
      authorAvatar: SAMPLE_AVATARS[4],
      content: 'The spring career fair is next Thursday in the Student Union. Make sure to bring your resume and dress professionally!',
      category: 'events',
      likesCount: 67,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      createdAt: new Date(now - 28800000).toISOString(),
      comments: [],
    },
    {
      id: generateId(),
      authorId: 'user_6',
      authorName: 'Dr. Emily Rodriguez',
      authorUsername: 'erodriguez',
      authorRole: 'faculty',
      authorAvatar: SAMPLE_AVATARS[5],
      content: 'Reminder: Final project proposals are due this Friday. Office hours are extended this week - feel free to stop by.',
      category: 'academic',
      likesCount: 31,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      createdAt: new Date(now - 43200000).toISOString(),
      comments: [],
    },
    {
      id: generateId(),
      authorId: 'user_7',
      authorName: 'Alex Kim',
      authorUsername: 'akim',
      authorRole: 'alumni',
      authorAvatar: SAMPLE_AVATARS[6],
      content: 'Just got promoted to Senior Engineer at a major tech company! Grateful for everything I learned during my time at university. Happy to mentor current students.',
      category: 'general',
      likesCount: 203,
      commentsCount: 0,
      isLiked: true,
      isSaved: false,
      createdAt: new Date(now - 86400000).toISOString(),
      comments: [],
    },
  ];
}

function seedConnections(): Connection[] {
  return [
    { id: 'user_2', name: 'Dr. Sarah Chen', username: 'schen', role: 'faculty', department: 'Computer Science', bio: 'Quantum computing researcher and CS professor. Passionate about mentoring the next generation.', avatarUrl: SAMPLE_AVATARS[1], status: 'connected', mutualConnections: 12, postsCount: 8, connectionsCount: 45 },
    { id: 'user_3', name: 'Marcus Johnson', username: 'mjohnson', role: 'student', department: 'Computer Science', bio: 'CS junior, hackathon enthusiast, building cool stuff with AI.', avatarUrl: SAMPLE_AVATARS[2], status: 'connected', mutualConnections: 8, postsCount: 15, connectionsCount: 67 },
    { id: 'user_4', name: 'Priya Patel', username: 'ppatel', role: 'alumni', department: 'Business', bio: 'Startup founder, Class of 2022. Hiring interns!', avatarUrl: SAMPLE_AVATARS[3], status: 'pending', mutualConnections: 5, postsCount: 12, connectionsCount: 120 },
    { id: 'user_5', name: 'James Park', username: 'jpark', role: 'student', department: 'Engineering', bio: 'Mechanical engineering student, career fair organizer.', avatarUrl: SAMPLE_AVATARS[4], status: 'suggested', mutualConnections: 15, postsCount: 6, connectionsCount: 34 },
    { id: 'user_6', name: 'Dr. Emily Rodriguez', username: 'erodriguez', role: 'faculty', department: 'Mathematics', bio: 'Mathematics professor specializing in applied statistics.', avatarUrl: SAMPLE_AVATARS[5], status: 'suggested', mutualConnections: 3, postsCount: 4, connectionsCount: 28 },
    { id: 'user_7', name: 'Alex Kim', username: 'akim', role: 'alumni', department: 'Computer Science', bio: 'Senior Engineer, Class of 2020. Open to mentoring!', avatarUrl: SAMPLE_AVATARS[6], status: 'connected', mutualConnections: 20, postsCount: 22, connectionsCount: 200 },
    { id: 'user_8', name: 'Sofia Martinez', username: 'smartinez', role: 'student', department: 'Design', bio: 'UX/UI designer, creative technologist, coffee addict.', avatarUrl: SAMPLE_AVATARS[7], status: 'suggested', mutualConnections: 7, postsCount: 9, connectionsCount: 55 },
    { id: 'user_9', name: 'David Lee', username: 'dlee', role: 'student', department: 'Data Science', bio: 'Data science enthusiast, Kaggle competitor, ML researcher.', avatarUrl: SAMPLE_AVATARS[8], status: 'pending', mutualConnections: 11, postsCount: 3, connectionsCount: 42 },
  ];
}

function seedConversations(): Conversation[] {
  const now = Date.now();
  return [
    { id: 'conv_1', participantId: 'user_3', participantName: 'Marcus Johnson', participantAvatar: SAMPLE_AVATARS[2], participantRole: 'student', lastMessage: 'Hey, are you going to the hackathon?', lastMessageAt: new Date(now - 1800000).toISOString(), unreadCount: 2 },
    { id: 'conv_2', participantId: 'user_4', participantName: 'Priya Patel', participantAvatar: SAMPLE_AVATARS[3], participantRole: 'alumni', lastMessage: 'Thanks for reaching out about the internship!', lastMessageAt: new Date(now - 7200000).toISOString(), unreadCount: 0 },
    { id: 'conv_3', participantId: 'user_2', participantName: 'Dr. Sarah Chen', participantAvatar: SAMPLE_AVATARS[1], participantRole: 'faculty', lastMessage: 'Your research proposal looks great.', lastMessageAt: new Date(now - 86400000).toISOString(), unreadCount: 1 },
  ];
}

function seedMessages(): Record<string, Message[]> {
  const now = Date.now();
  return {
    conv_1: [
      { id: generateId(), conversationId: 'conv_1', senderId: 'user_3', content: 'Hey! How is the semester going?', createdAt: new Date(now - 86400000).toISOString() },
      { id: generateId(), conversationId: 'conv_1', senderId: 'self', content: 'Going well! Busy with projects though.', createdAt: new Date(now - 82800000).toISOString() },
      { id: generateId(), conversationId: 'conv_1', senderId: 'user_3', content: 'Same here. Are you going to the hackathon this weekend?', createdAt: new Date(now - 3600000).toISOString() },
      { id: generateId(), conversationId: 'conv_1', senderId: 'user_3', content: 'Hey, are you going to the hackathon?', createdAt: new Date(now - 1800000).toISOString() },
    ],
    conv_2: [
      { id: generateId(), conversationId: 'conv_2', senderId: 'self', content: 'Hi Priya! I saw your post about summer internships. I would love to learn more.', createdAt: new Date(now - 14400000).toISOString() },
      { id: generateId(), conversationId: 'conv_2', senderId: 'user_4', content: 'Thanks for reaching out about the internship!', createdAt: new Date(now - 7200000).toISOString() },
    ],
    conv_3: [
      { id: generateId(), conversationId: 'conv_3', senderId: 'self', content: 'Dr. Chen, I submitted my research proposal. Could you review it?', createdAt: new Date(now - 172800000).toISOString() },
      { id: generateId(), conversationId: 'conv_3', senderId: 'user_2', content: 'Your research proposal looks great.', createdAt: new Date(now - 86400000).toISOString() },
    ],
  };
}

function seedNotifications(): Notification[] {
  const now = Date.now();
  return [
    { id: generateId(), type: 'like', actorName: 'Marcus Johnson', actorAvatar: SAMPLE_AVATARS[2], message: 'liked your post', read: false, createdAt: new Date(now - 1800000).toISOString() },
    { id: generateId(), type: 'connection', actorName: 'Priya Patel', actorAvatar: SAMPLE_AVATARS[3], message: 'sent you a connection request', read: false, createdAt: new Date(now - 7200000).toISOString() },
    { id: generateId(), type: 'comment', actorName: 'Dr. Sarah Chen', actorAvatar: SAMPLE_AVATARS[1], message: 'commented on your post', read: true, createdAt: new Date(now - 14400000).toISOString() },
    { id: generateId(), type: 'event', actorName: 'Campus Events', actorAvatar: SAMPLE_AVATARS[9], message: 'Spring Career Fair is tomorrow', read: true, createdAt: new Date(now - 86400000).toISOString() },
  ];
}

function seedEvents(): Event[] {
  const now = Date.now();
  return [
    {
      id: generateId(), title: 'Spring Career Fair', description: 'Meet top employers from tech, finance, and consulting. Bring your resume and dress professionally. Over 50 companies will be present.', location: 'Student Union Grand Hall',
      date: new Date(now + 86400000).toISOString(), time: '10:00 AM - 4:00 PM', category: 'career',
      organizerName: 'Career Services', organizerRole: 'faculty', organizerAvatar: SAMPLE_AVATARS[5],
      attendeesCount: 234, maxAttendees: 500, isRsvped: false,
    },
    {
      id: generateId(), title: 'AI/ML Research Symposium', description: 'Presenting cutting-edge research in artificial intelligence and machine learning from faculty and graduate students. Keynote by a leading AI researcher.', location: 'Engineering Building, Room 301',
      date: new Date(now + 172800000).toISOString(), time: '2:00 PM - 6:00 PM', category: 'academic',
      organizerName: 'Dr. Sarah Chen', organizerRole: 'faculty', organizerAvatar: SAMPLE_AVATARS[1],
      attendeesCount: 89, maxAttendees: 150, isRsvped: true,
    },
    {
      id: generateId(), title: 'Weekend Hackathon', description: '48-hour hackathon! Build something amazing with your team. Prizes for top 3 teams. Food and drinks provided.', location: 'Innovation Lab',
      date: new Date(now + 345600000).toISOString(), time: 'Fri 6PM - Sun 6PM', category: 'social',
      organizerName: 'Marcus Johnson', organizerRole: 'student', organizerAvatar: SAMPLE_AVATARS[2],
      attendeesCount: 45, maxAttendees: 100, isRsvped: false,
    },
    {
      id: generateId(), title: 'React Native Workshop', description: 'Hands-on workshop covering React Native fundamentals, navigation, and state management. Perfect for beginners and intermediate developers.', location: 'CS Lab 204',
      date: new Date(now + 604800000).toISOString(), time: '1:00 PM - 4:00 PM', category: 'workshop',
      organizerName: 'Alex Kim', organizerRole: 'alumni', organizerAvatar: SAMPLE_AVATARS[6],
      attendeesCount: 28, maxAttendees: 40, isRsvped: false,
    },
    {
      id: generateId(), title: 'Intramural Basketball Tournament', description: 'Annual basketball tournament. Form teams of 5 and compete for the championship trophy!', location: 'University Gym',
      date: new Date(now + 864000000).toISOString(), time: '3:00 PM - 8:00 PM', category: 'sports',
      organizerName: 'Sports Club', organizerRole: 'student', organizerAvatar: SAMPLE_AVATARS[8],
      attendeesCount: 64, maxAttendees: 80, isRsvped: false,
    },
  ];
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function createUserProfile(data: { name: string; role: UserRole; department: string; bio?: string; graduationYear?: string }): Promise<UserProfile> {
  const profile: UserProfile = {
    id: 'self',
    name: data.name,
    username: data.name.toLowerCase().replace(/\s+/g, ''),
    email: `${data.name.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
    role: data.role,
    department: data.department,
    bio: data.bio || '',
    avatarUrl: SAMPLE_AVATARS[0],
    graduationYear: data.graduationYear,
    joinedAt: new Date().toISOString(),
    connectionsCount: 3,
    postsCount: 0,
  };
  await saveUserProfile(profile);
  return profile;
}

export async function getPosts(): Promise<Post[]> {
  const data = await AsyncStorage.getItem(KEYS.POSTS);
  if (data) return JSON.parse(data);
  const posts = seedPosts();
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  return posts;
}

export async function getPostById(id: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find(p => p.id === id) || null;
}

export async function addPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount' | 'isLiked' | 'isSaved' | 'comments'>): Promise<Post> {
  const posts = await getPosts();
  const newPost: Post = {
    ...post,
    id: generateId(),
    likesCount: 0,
    commentsCount: 0,
    isLiked: false,
    isSaved: false,
    createdAt: new Date().toISOString(),
    comments: [],
  };
  posts.unshift(newPost);
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  return newPost;
}

export async function toggleLikePost(postId: string): Promise<Post[]> {
  const posts = await getPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx !== -1) {
    posts[idx].isLiked = !posts[idx].isLiked;
    posts[idx].likesCount += posts[idx].isLiked ? 1 : -1;
  }
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  return posts;
}

export async function toggleSavePost(postId: string): Promise<Post[]> {
  const posts = await getPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx !== -1) {
    posts[idx].isSaved = !posts[idx].isSaved;
  }
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  return posts;
}

export async function addComment(postId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Post[]> {
  const posts = await getPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx !== -1) {
    const newComment: Comment = { ...comment, id: generateId(), createdAt: new Date().toISOString() };
    posts[idx].comments.push(newComment);
    posts[idx].commentsCount++;
  }
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  return posts;
}

export async function getConnections(): Promise<Connection[]> {
  const data = await AsyncStorage.getItem(KEYS.CONNECTIONS);
  if (data) return JSON.parse(data);
  const connections = seedConnections();
  await AsyncStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(connections));
  return connections;
}

export async function getConnectionById(id: string): Promise<Connection | null> {
  const connections = await getConnections();
  return connections.find(c => c.id === id) || null;
}

export async function updateConnectionStatus(id: string, status: Connection['status']): Promise<Connection[]> {
  const connections = await getConnections();
  const idx = connections.findIndex(c => c.id === id);
  if (idx !== -1) {
    connections[idx].status = status;
  }
  await AsyncStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(connections));
  return connections;
}

export async function getConversations(): Promise<Conversation[]> {
  const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
  if (data) return JSON.parse(data);
  const conversations = seedConversations();
  await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  return conversations;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const data = await AsyncStorage.getItem(KEYS.MESSAGES);
  const allMessages: Record<string, Message[]> = data ? JSON.parse(data) : seedMessages();
  if (!data) {
    await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(allMessages));
  }
  return allMessages[conversationId] || [];
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const data = await AsyncStorage.getItem(KEYS.MESSAGES);
  const allMessages: Record<string, Message[]> = data ? JSON.parse(data) : seedMessages();
  const msg: Message = {
    id: generateId(),
    conversationId,
    senderId: 'self',
    content,
    createdAt: new Date().toISOString(),
  };
  if (!allMessages[conversationId]) allMessages[conversationId] = [];
  allMessages[conversationId].push(msg);
  await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(allMessages));

  const convData = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
  const convs: Conversation[] = convData ? JSON.parse(convData) : seedConversations();
  const convIdx = convs.findIndex(c => c.id === conversationId);
  if (convIdx !== -1) {
    convs[convIdx].lastMessage = content;
    convs[convIdx].lastMessageAt = msg.createdAt;
  }
  await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));

  return msg;
}

export async function getNotifications(): Promise<Notification[]> {
  const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
  if (data) return JSON.parse(data);
  const notifications = seedNotifications();
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  return notifications;
}

export async function markNotificationRead(id: string): Promise<Notification[]> {
  const notifications = await getNotifications();
  const idx = notifications.findIndex(n => n.id === id);
  if (idx !== -1) notifications[idx].read = true;
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  return notifications;
}

export async function getEvents(): Promise<Event[]> {
  const data = await AsyncStorage.getItem(KEYS.EVENTS);
  if (data) return JSON.parse(data);
  const events = seedEvents();
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  return events;
}

export async function getEventById(id: string): Promise<Event | null> {
  const events = await getEvents();
  return events.find(e => e.id === id) || null;
}

export async function toggleRsvp(eventId: string): Promise<Event[]> {
  const events = await getEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx !== -1) {
    events[idx].isRsvped = !events[idx].isRsvped;
    events[idx].attendeesCount += events[idx].isRsvped ? 1 : -1;
  }
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
  return events;
}

export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
