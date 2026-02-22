/**
 * @deprecated — MOCK LAYER. Will be removed once all screens migrate to
 * lib/api/* + React Query. Do NOT add new consumers.
 */
import type { UserRole } from './auth-context';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorDepartment: string;
  authorRole: UserRole;
  content: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  attachmentUrl?: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
}

export interface Person {
  id: string;
  fullName: string;
  department: string;
  graduationYear: string;
  role: UserRole;
  bio: string;
  avatarUrl: string | null;
  connectionStatus: 'none' | 'pending' | 'connected';
  mutualConnections: number;
  title?: string;
  postCount: number;
  connectionCount: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizerName: string;
  organizerId: string;
  attendeesCount: number;
  isRsvpd: boolean;
  category: 'workshop' | 'meetup' | 'seminar' | 'social' | 'career';
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'connection' | 'event' | 'mention' | 'message';
  actorName: string;
  actorId: string;
  targetId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const names = [
  'Arjun Sharma', 'Priya Patel', 'Ravi Kumar', 'Sneha Reddy',
  'Vikram Singh', 'Anita Desai', 'Karthik Iyer', 'Meera Nair',
  'Rohit Gupta', 'Divya Menon', 'Aditya Joshi', 'Lakshmi Pillai',
  'Dr. Ramesh Rao', 'Prof. Sunita Verma', 'Dr. Amit Khanna',
];

const departments = [
  'Computer Science', 'Electronics', 'Mechanical', 'Civil',
  'Information Technology', 'Electrical', 'Chemical', 'Biotechnology',
];

const bios = [
  'Passionate about building things that matter',
  'Full-stack developer | Open source enthusiast',
  'Learning something new every day',
  'Building the future, one line at a time',
  'Data Science | Machine Learning | AI',
  'Cloud architect | DevOps practitioner',
  'Research in distributed systems and IoT',
  'Teaching and mentoring the next generation',
];

const facultyTitles = [
  'Associate Professor', 'Assistant Professor', 'Professor',
  'Head of Department', 'Dean of Engineering',
];

function getRoleForIndex(i: number): UserRole {
  if (i >= 12) return 'Faculty';
  if (i % 4 === 0) return 'Alumni';
  return 'Student';
}

export function generateMockPosts(count: number = 15): Post[] {
  const posts: Post[] = [];
  const contents = [
    'Just completed my final year project on distributed systems! Thanks to everyone who helped along the way.',
    'Looking for teammates for the upcoming hackathon. Anyone interested in building an AI-powered study assistant?',
    'Great networking session at the alumni meetup yesterday. Connected with some amazing people from the industry.',
    'Tips for cracking tech interviews: 1. Practice DSA daily 2. Build projects 3. Network with alumni 4. Stay consistent',
    'Excited to share that I got placed at a top tech company! Hard work pays off.',
    'Anyone else attending the workshop on cloud computing this weekend? Would love to connect!',
    'Just published my first research paper on machine learning applications in healthcare. Surreal feeling!',
    'Organizing a coding bootcamp for juniors next month. Drop a comment if you want to volunteer as a mentor.',
    'The campus sustainability drive was a huge success! Over 500 students participated.',
    'Sharing my internship experience at a startup - thread below with key takeaways and lessons learned.',
    'New club alert: We are starting a blockchain and Web3 interest group. Join us for the first meeting!',
    'Completed the AWS Solutions Architect certification. Happy to help anyone preparing for it.',
    'The annual techfest dates are out! Mark your calendars and start preparing your projects.',
    'Looking for open source contributors for our college management app. Tech stack: React, Node.js, PostgreSQL.',
    'Alumni spotlight: Our 2020 batch senior just got featured in Forbes 30 Under 30!',
  ];

  for (let i = 0; i < count; i++) {
    const nameIdx = i % names.length;
    const hoursAgo = Math.floor(Math.random() * 72);
    const date = new Date(Date.now() - hoursAgo * 3600000);
    posts.push({
      id: `post_${i}`,
      authorId: `user_${nameIdx}`,
      authorName: names[nameIdx],
      authorAvatar: null,
      authorDepartment: departments[nameIdx % departments.length],
      authorRole: getRoleForIndex(nameIdx),
      content: contents[i % contents.length],
      likesCount: Math.floor(Math.random() * 50),
      commentsCount: Math.floor(Math.random() * 20),
      sharesCount: Math.floor(Math.random() * 10),
      isLiked: Math.random() > 0.7,
      isSaved: Math.random() > 0.85,
      createdAt: date.toISOString(),
    });
  }
  return posts;
}

export function generateMockComments(postId: string, count: number = 5): Comment[] {
  const comments: Comment[] = [];
  const texts = [
    'Great post! Really insightful.',
    'Thanks for sharing this, very helpful!',
    'I had a similar experience. Would love to connect.',
    'This is exactly what I needed. Appreciate it!',
    'Can you share more details about this?',
    'Congratulations! Well deserved.',
    'Interesting perspective, thanks for sharing.',
    'I would love to collaborate on this!',
  ];

  for (let i = 0; i < count; i++) {
    const nameIdx = (i + 2) % names.length;
    const minutesAgo = Math.floor(Math.random() * 1440);
    comments.push({
      id: `comment_${postId}_${i}`,
      postId,
      authorId: `user_${nameIdx}`,
      authorName: names[nameIdx],
      authorRole: getRoleForIndex(nameIdx),
      content: texts[i % texts.length],
      createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      likesCount: Math.floor(Math.random() * 10),
      isLiked: Math.random() > 0.7,
    });
  }
  return comments;
}

export function generateMockPeople(count: number = 20): Person[] {
  const people: Person[] = [];
  for (let i = 0; i < count; i++) {
    const nameIdx = i % names.length;
    const statuses: ('none' | 'pending' | 'connected')[] = ['none', 'pending', 'connected'];
    const role = getRoleForIndex(nameIdx);
    people.push({
      id: `user_${i}`,
      fullName: names[nameIdx],
      department: departments[i % departments.length],
      graduationYear: role === 'Faculty' ? '' : `${2022 + (i % 5)}`,
      role,
      bio: bios[i % bios.length],
      avatarUrl: null,
      connectionStatus: statuses[i % 3],
      mutualConnections: Math.floor(Math.random() * 15),
      title: role === 'Faculty' ? facultyTitles[i % facultyTitles.length] : undefined,
      postCount: Math.floor(Math.random() * 30),
      connectionCount: Math.floor(Math.random() * 100) + 5,
    });
  }
  return people;
}

export function generateMockEvents(count: number = 8): Event[] {
  const events: Event[] = [];
  const titles = [
    'Tech Talk: Future of AI',
    'Alumni Networking Dinner',
    'Hackathon 2026',
    'Resume Building Workshop',
    'Campus Career Fair',
    'Web Development Bootcamp',
    'Research Symposium',
    'Startup Pitch Night',
  ];
  const descriptions = [
    'Join us for an insightful session on the latest trends in artificial intelligence and machine learning. Industry experts will share their experiences and answer your questions.',
    'Connect with distinguished alumni over dinner and expand your professional network. This is a great opportunity to learn from those who have been in your shoes.',
    'Build something amazing in 24 hours! Teams of 3-5 welcome. Prizes worth over $5,000 to be won across multiple categories.',
    'Learn how to craft the perfect resume that gets you noticed by top recruiters. Bring your current resume for a live review session.',
    'Meet hiring managers from 50+ companies across various industries. Bring multiple copies of your resume and dress professionally.',
    'Hands-on workshop covering modern web development with React and Node.js. Laptops required. Prior programming experience recommended.',
    'Present your research findings and get feedback from peers and professors. Paper submissions due one week before the event.',
    'Pitch your startup idea to a panel of investors and mentors. Top 3 ideas receive seed funding and mentorship support.',
  ];
  const categories: Event['category'][] = ['seminar', 'social', 'workshop', 'workshop', 'career', 'workshop', 'seminar', 'meetup'];
  const locations = ['Auditorium A', 'Conference Hall', 'Lab 201', 'Seminar Room 3', 'Main Campus', 'Computer Lab', 'Library Hall', 'Innovation Center'];

  for (let i = 0; i < count; i++) {
    const daysAhead = Math.floor(Math.random() * 30) + 1;
    const eventDate = new Date(Date.now() + daysAhead * 86400000);
    const nameIdx = i % names.length;
    events.push({
      id: `event_${i}`,
      title: titles[i % titles.length],
      description: descriptions[i % descriptions.length],
      date: eventDate.toISOString().split('T')[0],
      time: `${10 + (i % 8)}:00`,
      location: locations[i % locations.length],
      organizerName: names[nameIdx],
      organizerId: `user_${nameIdx}`,
      attendeesCount: Math.floor(Math.random() * 100) + 10,
      isRsvpd: Math.random() > 0.7,
      category: categories[i % categories.length],
    });
  }
  return events;
}

export function generateMockConversations(count: number = 8): Conversation[] {
  const conversations: Conversation[] = [];
  const messages = [
    'Hey! Are you attending the hackathon?',
    'Sure, let me send you the project details.',
    'Thanks for connecting! Would love to chat.',
    'Can you share the notes from today?',
    'Great presentation today!',
    'Let me know when you are free to discuss.',
    'I saw your post about the internship, interested!',
    'Welcome to the college network!',
  ];

  for (let i = 0; i < count; i++) {
    const nameIdx = (i + 3) % names.length;
    const minutesAgo = Math.floor(Math.random() * 1440);
    conversations.push({
      id: `conv_${i}`,
      participantId: `user_${nameIdx}`,
      participantName: names[nameIdx],
      participantAvatar: null,
      lastMessage: messages[i % messages.length],
      lastMessageTime: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      unreadCount: Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0,
      isOnline: Math.random() > 0.5,
    });
  }
  return conversations;
}

export function generateMockMessages(conversationId: string): Message[] {
  const msgs: Message[] = [];
  const texts = [
    'Hey, how are you doing?',
    'I am good! Working on the project.',
    'Nice! Which tech stack are you using?',
    'React Native with TypeScript. Its going well so far.',
    'That sounds great! Let me know if you need help.',
    'Will do, thanks! Are you going to the meetup?',
    'Yes, I will be there. See you then!',
    'Perfect, see you there!',
  ];

  for (let i = 0; i < texts.length; i++) {
    msgs.push({
      id: `msg_${conversationId}_${i}`,
      conversationId,
      senderId: i % 2 === 0 ? 'other' : 'me',
      text: texts[i],
      timestamp: new Date(Date.now() - (texts.length - i) * 300000).toISOString(),
      isRead: true,
    });
  }
  return msgs;
}

export function generateMockNotifications(count: number = 12): Notification[] {
  const notifications: Notification[] = [];
  const types: Notification['type'][] = ['like', 'comment', 'connection', 'event', 'mention', 'message'];
  const messageTemplates: Record<Notification['type'], string[]> = {
    like: ['liked your post', 'liked your comment'],
    comment: ['commented on your post', 'replied to your comment'],
    connection: ['sent you a connection request', 'accepted your connection request', 'wants to connect with you'],
    event: ['invited you to an event', 'RSVP\'d to your event'],
    mention: ['mentioned you in a post', 'tagged you in a comment'],
    message: ['sent you a message'],
  };

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const nameIdx = (i + 1) % names.length;
    const templates = messageTemplates[type];
    const minutesAgo = Math.floor(Math.random() * 2880) + 5;
    notifications.push({
      id: `notif_${i}`,
      type,
      actorName: names[nameIdx],
      actorId: `user_${nameIdx}`,
      targetId: type === 'event' ? `event_${i % 8}` : `post_${i % 15}`,
      message: `${names[nameIdx]} ${templates[i % templates.length]}`,
      createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      isRead: i > 3,
    });
  }
  return notifications;
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(n => !n.startsWith('Dr') && !n.startsWith('Prof'))
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const avatarColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getRoleBadge(role: UserRole): { text: string; variant: 'primary' | 'success' | 'warning' } {
  switch (role) {
    case 'Alumni': return { text: 'Alumni', variant: 'primary' };
    case 'Faculty': return { text: 'Faculty', variant: 'warning' };
    default: return { text: 'Student', variant: 'success' };
  }
}
