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
      id: generateId(), authorId: 'user_2', authorName: 'Dr. Sarah Chen', authorUsername: 'schen',
      authorRole: 'faculty', authorAvatar: SAMPLE_AVATARS[1],
      content: 'Excited to announce our new research lab in quantum computing opens next semester. Looking for motivated students to join the team!',
      category: 'academic', likesCount: 42, commentsCount: 3, isLiked: false, isSaved: false,
      createdAt: new Date(now - 3600000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_3', authorName: 'Alex Rivera', authorAvatar: SAMPLE_AVATARS[2], authorRole: 'student', content: 'This is amazing! I would love to apply.', createdAt: new Date(now - 3000000).toISOString() },
        { id: generateId(), authorId: 'user_4', authorName: 'Priya Sharma', authorAvatar: SAMPLE_AVATARS[3], authorRole: 'student', content: 'What prerequisites do we need?', createdAt: new Date(now - 2400000).toISOString() },
        { id: generateId(), authorId: 'user_2', authorName: 'Dr. Sarah Chen', authorAvatar: SAMPLE_AVATARS[1], authorRole: 'faculty', content: 'Linear algebra and intro to quantum mechanics are recommended!', createdAt: new Date(now - 1800000).toISOString() },
      ],
    },
    {
      id: generateId(), authorId: 'user_3', authorName: 'Alex Rivera', authorUsername: 'arivera',
      authorRole: 'student', authorAvatar: SAMPLE_AVATARS[2],
      content: 'Just finished my final presentation on machine learning applications in healthcare. Huge thanks to my advisor and peers who helped along the way!',
      category: 'academic', likesCount: 28, commentsCount: 1, isLiked: true, isSaved: false,
      createdAt: new Date(now - 7200000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_5', authorName: 'Jordan Lee', authorAvatar: SAMPLE_AVATARS[4], authorRole: 'student', content: 'Congrats! Your work was inspiring.', createdAt: new Date(now - 6600000).toISOString() },
      ],
    },
    {
      id: generateId(), authorId: 'user_6', authorName: 'Maria Gonzalez', authorUsername: 'mgonzalez',
      authorRole: 'alumni', authorAvatar: SAMPLE_AVATARS[5],
      content: 'Looking to mentor current students in product management. I have 5+ years at top tech companies. DM me if interested!',
      category: 'career', likesCount: 67, commentsCount: 2, isLiked: false, isSaved: true,
      createdAt: new Date(now - 14400000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_3', authorName: 'Alex Rivera', authorAvatar: SAMPLE_AVATARS[2], authorRole: 'student', content: 'This is a great opportunity!', createdAt: new Date(now - 13800000).toISOString() },
        { id: generateId(), authorId: 'user_7', authorName: 'David Kim', authorAvatar: SAMPLE_AVATARS[6], authorRole: 'student', content: 'Just sent you a message!', createdAt: new Date(now - 13200000).toISOString() },
      ],
    },
    {
      id: generateId(), authorId: 'user_8', authorName: 'Prof. James Wilson', authorUsername: 'jwilson',
      authorRole: 'faculty', authorAvatar: SAMPLE_AVATARS[7],
      content: 'Reminder: The annual tech symposium is this Friday at the main auditorium. All departments welcome. Free pizza!',
      category: 'events', likesCount: 93, commentsCount: 0, isLiked: false, isSaved: false,
      createdAt: new Date(now - 28800000).toISOString(), comments: [],
    },
    {
      id: generateId(), authorId: 'user_5', authorName: 'Jordan Lee', authorUsername: 'jlee',
      authorRole: 'student', authorAvatar: SAMPLE_AVATARS[4],
      content: 'Anyone interested in forming a study group for Advanced Algorithms? Meeting at the library every Tuesday at 6pm.',
      category: 'social', likesCount: 15, commentsCount: 1, isLiked: false, isSaved: false,
      createdAt: new Date(now - 43200000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_9', authorName: 'Emma Thompson', authorAvatar: SAMPLE_AVATARS[8], authorRole: 'student', content: 'Count me in!', createdAt: new Date(now - 42600000).toISOString() },
      ],
    },
    {
      id: generateId(), authorId: 'user_10', authorName: 'Robert Chen', authorUsername: 'rchen',
      authorRole: 'alumni', authorAvatar: SAMPLE_AVATARS[9],
      content: 'Just published my first paper since graduating! Research in sustainable energy systems. Grateful for the foundation this university gave me.',
      category: 'general', likesCount: 54, commentsCount: 0, isLiked: false, isSaved: false,
      createdAt: new Date(now - 86400000).toISOString(), comments: [],
    },
    {
      id: generateId(), authorId: 'user_4', authorName: 'Priya Sharma', authorUsername: 'psharma',
      authorRole: 'student', authorAvatar: SAMPLE_AVATARS[3],
      content: 'Hiring interns at my startup this summer! We are building tools for climate research. DM for details.',
      category: 'career', likesCount: 38, commentsCount: 2, isLiked: false, isSaved: false,
      createdAt: new Date(now - 172800000).toISOString(),
      comments: [
        { id: generateId(), authorId: 'user_7', authorName: 'David Kim', authorAvatar: SAMPLE_AVATARS[6], authorRole: 'student', content: 'What tech stack are you using?', createdAt: new Date(now - 172200000).toISOString() },
        { id: generateId(), authorId: 'user_4', authorName: 'Priya Sharma', authorAvatar: SAMPLE_AVATARS[3], authorRole: 'student', content: 'Python, React, and AWS mainly.', createdAt: new Date(now - 171600000).toISOString() },
      ],
    },
  ];
}

function seedConnections(): Connection[] {
  return [
    { id: 'user_2', name: 'Dr. Sarah Chen', username: 'schen', role: 'faculty', department: 'Computer Science', avatarUrl: SAMPLE_AVATARS[1], bio: 'Quantum computing researcher', status: 'connected', mutualConnections: 12, postsCount: 24, connectionsCount: 156 },
    { id: 'user_3', name: 'Alex Rivera', username: 'arivera', role: 'student', department: 'Computer Science', avatarUrl: SAMPLE_AVATARS[2], bio: 'ML enthusiast, final year CS student', status: 'connected', mutualConnections: 8, postsCount: 15, connectionsCount: 89 },
    { id: 'user_4', name: 'Priya Sharma', username: 'psharma', role: 'student', department: 'Engineering', avatarUrl: SAMPLE_AVATARS[3], bio: 'Climate tech founder', status: 'pending', mutualConnections: 5, postsCount: 10, connectionsCount: 67 },
    { id: 'user_5', name: 'Jordan Lee', username: 'jlee', role: 'student', department: 'Mathematics', avatarUrl: SAMPLE_AVATARS[4], bio: 'Math nerd, loves algorithms', status: 'connected', mutualConnections: 3, postsCount: 7, connectionsCount: 45 },
    { id: 'user_6', name: 'Maria Gonzalez', username: 'mgonzalez', role: 'alumni', department: 'Business', avatarUrl: SAMPLE_AVATARS[5], bio: 'PM at BigTech, class of 2019', status: 'suggested', mutualConnections: 15, postsCount: 31, connectionsCount: 234 },
    { id: 'user_7', name: 'David Kim', username: 'dkim', role: 'student', department: 'Design', avatarUrl: SAMPLE_AVATARS[6], bio: 'UI/UX designer and developer', status: 'suggested', mutualConnections: 7, postsCount: 9, connectionsCount: 52 },
    { id: 'user_8', name: 'Prof. James Wilson', username: 'jwilson', role: 'faculty', department: 'Physics', avatarUrl: SAMPLE_AVATARS[7], bio: 'Theoretical physicist, department head', status: 'pending', mutualConnections: 4, postsCount: 18, connectionsCount: 198 },
    { id: 'user_9', name: 'Emma Thompson', username: 'ethompson', role: 'student', department: 'Biology', avatarUrl: SAMPLE_AVATARS[8], bio: 'Pre-med student, research assistant', status: 'suggested', mutualConnections: 2, postsCount: 5, connectionsCount: 34 },
    { id: 'user_10', name: 'Robert Chen', username: 'rchen', role: 'alumni', department: 'Engineering', avatarUrl: SAMPLE_AVATARS[9], bio: 'Sustainable energy researcher, class of 2020', status: 'connected', mutualConnections: 9, postsCount: 22, connectionsCount: 178 },
  ];
}

function seedConversations(): Conversation[] {
  const now = Date.now();
  return [
    { id: 'conv_1', participantId: 'user_2', participantName: 'Dr. Sarah Chen', participantAvatar: SAMPLE_AVATARS[1], participantRole: 'faculty', lastMessage: 'I will send you the research papers by tonight.', lastMessageAt: new Date(now - 1800000).toISOString(), unreadCount: 2 },
    { id: 'conv_2', participantId: 'user_3', participantName: 'Alex Rivera', participantAvatar: SAMPLE_AVATARS[2], participantRole: 'student', lastMessage: 'Are you going to the hackathon this weekend?', lastMessageAt: new Date(now - 7200000).toISOString(), unreadCount: 0 },
    { id: 'conv_3', participantId: 'user_6', participantName: 'Maria Gonzalez', participantAvatar: SAMPLE_AVATARS[5], participantRole: 'alumni', lastMessage: 'Thanks for the mentoring session today!', lastMessageAt: new Date(now - 86400000).toISOString(), unreadCount: 1 },
    { id: 'conv_4', participantId: 'user_5', participantName: 'Jordan Lee', participantAvatar: SAMPLE_AVATARS[4], participantRole: 'student', lastMessage: 'See you at the study group Tuesday!', lastMessageAt: new Date(now - 172800000).toISOString(), unreadCount: 0 },
  ];
}

function seedMessages(conversationId: string): Message[] {
  const now = Date.now();
  if (conversationId === 'conv_1') {
    return [
      { id: generateId(), conversationId, senderId: 'self', content: 'Hi Dr. Chen, I wanted to ask about the quantum computing research opportunity.', createdAt: new Date(now - 7200000).toISOString() },
      { id: generateId(), conversationId, senderId: 'user_2', content: 'Of course! We are looking for students with a strong math background.', createdAt: new Date(now - 6600000).toISOString() },
      { id: generateId(), conversationId, senderId: 'self', content: 'I have completed linear algebra and intro to quantum mechanics.', createdAt: new Date(now - 5400000).toISOString() },
      { id: generateId(), conversationId, senderId: 'user_2', content: 'Perfect! That is exactly what we need.', createdAt: new Date(now - 3600000).toISOString() },
      { id: generateId(), conversationId, senderId: 'user_2', content: 'I will send you the research papers by tonight.', createdAt: new Date(now - 1800000).toISOString() },
    ];
  }
  if (conversationId === 'conv_2') {
    return [
      { id: generateId(), conversationId, senderId: 'user_3', content: 'Hey! Are you going to the hackathon this weekend?', createdAt: new Date(now - 14400000).toISOString() },
      { id: generateId(), conversationId, senderId: 'self', content: 'Yes! I am teaming up with Jordan.', createdAt: new Date(now - 10800000).toISOString() },
      { id: generateId(), conversationId, senderId: 'user_3', content: 'Are you going to the hackathon this weekend?', createdAt: new Date(now - 7200000).toISOString() },
    ];
  }
  return [
    { id: generateId(), conversationId, senderId: 'self', content: 'Hello!', createdAt: new Date(now - 172800000).toISOString() },
    { id: generateId(), conversationId, senderId: conversationId.replace('conv_', 'user_'), content: 'Hey there!', createdAt: new Date(now - 172200000).toISOString() },
  ];
}

function seedNotifications(): Notification[] {
  const now = Date.now();
  return [
    { id: generateId(), type: 'like', actorName: 'Dr. Sarah Chen', actorAvatar: SAMPLE_AVATARS[1], message: 'liked your post', read: false, createdAt: new Date(now - 1800000).toISOString() },
    { id: generateId(), type: 'comment', actorName: 'Alex Rivera', actorAvatar: SAMPLE_AVATARS[2], message: 'commented on your post', read: false, createdAt: new Date(now - 3600000).toISOString() },
    { id: generateId(), type: 'connection', actorName: 'Maria Gonzalez', actorAvatar: SAMPLE_AVATARS[5], message: 'accepted your connection request', read: true, createdAt: new Date(now - 7200000).toISOString() },
    { id: generateId(), type: 'mention', actorName: 'Jordan Lee', actorAvatar: SAMPLE_AVATARS[4], message: 'mentioned you in a post', read: false, createdAt: new Date(now - 14400000).toISOString() },
    { id: generateId(), type: 'event', actorName: 'Prof. James Wilson', actorAvatar: SAMPLE_AVATARS[7], message: 'invited you to Tech Symposium', read: true, createdAt: new Date(now - 28800000).toISOString() },
    { id: generateId(), type: 'like', actorName: 'Emma Thompson', actorAvatar: SAMPLE_AVATARS[8], message: 'liked your comment', read: true, createdAt: new Date(now - 43200000).toISOString() },
    { id: generateId(), type: 'connection', actorName: 'David Kim', actorAvatar: SAMPLE_AVATARS[6], message: 'wants to connect with you', read: false, createdAt: new Date(now - 86400000).toISOString() },
  ];
}

function seedEvents(): Event[] {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: generateId(), title: 'Annual Tech Symposium', description: 'Join us for the biggest tech event on campus. Featuring talks from industry leaders, project demos, and networking opportunities. All departments welcome!',
      location: 'Main Auditorium, Building A', date: new Date(now + 2 * day).toISOString(), time: '10:00 AM - 5:00 PM',
      category: 'academic', organizerName: 'Prof. James Wilson', organizerRole: 'faculty', organizerAvatar: SAMPLE_AVATARS[7],
      attendeesCount: 156, maxAttendees: 300, isRsvped: false,
    },
    {
      id: generateId(), title: 'Startup Pitch Night', description: 'Student entrepreneurs pitch their ideas to a panel of investors and mentors. Great networking opportunity!',
      location: 'Innovation Hub', date: new Date(now + 5 * day).toISOString(), time: '6:00 PM - 9:00 PM',
      category: 'career', organizerName: 'Maria Gonzalez', organizerRole: 'alumni', organizerAvatar: SAMPLE_AVATARS[5],
      attendeesCount: 78, maxAttendees: 120, isRsvped: true,
    },
    {
      id: generateId(), title: 'Campus Volleyball Tournament', description: 'Annual inter-department volleyball tournament. Form teams of 6 and register by Friday!',
      location: 'Sports Complex', date: new Date(now + 7 * day).toISOString(), time: '9:00 AM - 4:00 PM',
      category: 'sports', organizerName: 'Jordan Lee', organizerRole: 'student', organizerAvatar: SAMPLE_AVATARS[4],
      attendeesCount: 45, maxAttendees: 64, isRsvped: false,
    },
    {
      id: generateId(), title: 'Python for Data Science Workshop', description: 'Hands-on workshop covering pandas, numpy, and visualization libraries. Laptops required.',
      location: 'Computer Lab 201', date: new Date(now + 3 * day).toISOString(), time: '2:00 PM - 5:00 PM',
      category: 'workshop', organizerName: 'Dr. Sarah Chen', organizerRole: 'faculty', organizerAvatar: SAMPLE_AVATARS[1],
      attendeesCount: 28, maxAttendees: 40, isRsvped: false,
    },
    {
      id: generateId(), title: 'Alumni Mixer & Networking', description: 'Connect with successful alumni from various industries. Refreshments provided.',
      location: 'Student Center Lounge', date: new Date(now + 10 * day).toISOString(), time: '5:00 PM - 8:00 PM',
      category: 'social', organizerName: 'Robert Chen', organizerRole: 'alumni', organizerAvatar: SAMPLE_AVATARS[9],
      attendeesCount: 92, maxAttendees: 150, isRsvped: true,
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
  const id = generateId();
  const username = data.name.toLowerCase().replace(/\s+/g, '').slice(0, 12) + Math.floor(Math.random() * 100);
  const profile: UserProfile = {
    id, name: data.name, username,
    email: `${username}@campus.edu`, role: data.role,
    department: data.department, bio: data.bio || '',
    avatarUrl: SAMPLE_AVATARS[Math.floor(Math.random() * SAMPLE_AVATARS.length)],
    graduationYear: data.graduationYear, joinedAt: new Date().toISOString(),
    connectionsCount: 0, postsCount: 0,
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

export async function addPost(data: Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'isLiked' | 'isSaved' | 'createdAt' | 'comments'>): Promise<Post[]> {
  const posts = await getPosts();
  const newPost: Post = {
    ...data, id: generateId(), likesCount: 0, commentsCount: 0,
    isLiked: false, isSaved: false, createdAt: new Date().toISOString(), comments: [],
  };
  const updated = [newPost, ...posts];
  await AsyncStorage.setItem(KEYS.POSTS, JSON.stringify(updated));
  return updated;
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

export async function addComment(postId: string, data: Omit<Comment, 'id' | 'createdAt'>): Promise<Post[]> {
  const posts = await getPosts();
  const idx = posts.findIndex(p => p.id === postId);
  if (idx !== -1) {
    const comment: Comment = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    posts[idx].comments.push(comment);
    posts[idx].commentsCount = posts[idx].comments.length;
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
  if (idx !== -1) connections[idx].status = status;
  await AsyncStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(connections));
  return connections;
}

export async function getConversations(): Promise<Conversation[]> {
  const data = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
  if (data) return JSON.parse(data);
  const convs = seedConversations();
  await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
  return convs;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const key = `${KEYS.MESSAGES}_${conversationId}`;
  const data = await AsyncStorage.getItem(key);
  if (data) return JSON.parse(data);
  const messages = seedMessages(conversationId);
  await AsyncStorage.setItem(key, JSON.stringify(messages));
  return messages;
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const key = `${KEYS.MESSAGES}_${conversationId}`;
  const messages = await getMessages(conversationId);
  const msg: Message = { id: generateId(), conversationId, senderId: 'self', content, createdAt: new Date().toISOString() };
  messages.push(msg);
  await AsyncStorage.setItem(key, JSON.stringify(messages));

  const convs = await getConversations();
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
