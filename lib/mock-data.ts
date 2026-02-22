import { formatDistanceToNow } from 'date-fns';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  userType: 'Student' | 'Alumni' | 'Faculty';
  department: string;
  year: string;
  bio: string;
  location: string;
  college: string;
  connectionStatus: 'none' | 'pending' | 'connected';
  skills: string[];
  experience: { title: string; company: string; period: string }[];
  education: { school: string; degree: string; period: string }[];
}

export interface Post {
  id: string;
  author: User;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked: boolean;
  tags: string[];
  college: string;
}

export interface Conversation {
  id: string;
  partner: User;
  lastMessage: string;
  timestamp: Date;
  unread: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  organizer: string;
  attendees: number;
  category: string;
  isRegistered: boolean;
}

const avatarColors = ['#E5A100', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#6366F1', '#14B8A6'];

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function formatTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false });
}

export const USERS: User[] = [
  {
    id: '1',
    name: 'Epu Sri Ram',
    avatar: '',
    role: 'Full-stack Developer',
    userType: 'Student',
    department: 'Computer Science and Engineering',
    year: '2026',
    bio: "I'm E. Sri Ram Vishal, a 19-year-old full-stack developer, student innovator, and startup enthusiast.",
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'pending',
    skills: ['React', 'Node.js', 'Python', 'AWS', 'TypeScript'],
    experience: [
      { title: 'Full Stack Developer', company: 'Freelance', period: '2024 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2022 - 2026' },
    ],
  },
  {
    id: '2',
    name: 'Pothuraju Ratna Teja',
    avatar: '',
    role: 'Software Engineer',
    userType: 'Alumni',
    department: 'Computer Science and Engineering',
    year: '2023',
    bio: 'Building products that make a difference. Focused on edtech and social impact.',
    location: 'Hyderabad, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'pending',
    skills: ['Java', 'Spring Boot', 'React', 'SQL', 'Docker'],
    experience: [
      { title: 'Software Engineer', company: 'TCS', period: '2023 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2019 - 2023' },
    ],
  },
  {
    id: '3',
    name: 'Chinta Dhaneshwarsa',
    avatar: '',
    role: 'Data Analyst',
    userType: 'Alumni',
    department: 'Computer Science',
    year: '2026',
    bio: 'Data enthusiast exploring ML and analytics. Open to collaborations.',
    location: 'Vizag, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'pending',
    skills: ['Python', 'SQL', 'Tableau', 'R', 'Statistics'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CS', period: '2022 - 2026' },
    ],
  },
  {
    id: '4',
    name: 'Gudivada Sri Vidya',
    avatar: '',
    role: 'Event Coordinator',
    userType: 'Student',
    department: 'Computer Science',
    year: '2026',
    bio: 'Active in campus clubs and events. Passionate about bringing the community together.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'none',
    skills: ['Event Management', 'Communication', 'Leadership', 'Design'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2022 - 2026' },
    ],
  },
  {
    id: '5',
    name: 'Kadiyala Harsha Vardhan',
    avatar: '',
    role: 'Backend Developer',
    userType: 'Student',
    department: 'Engineering',
    year: '2025',
    bio: 'Backend developer focused on scalable APIs and microservices.',
    location: 'Vizag, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Node.js', 'Go', 'PostgreSQL', 'Docker', 'Kubernetes'],
    experience: [
      { title: 'Backend Intern', company: 'Startup XYZ', period: '2024 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech Engineering', period: '2021 - 2025' },
    ],
  },
  {
    id: '6',
    name: 'Venkata Sai Charan Karri',
    avatar: '',
    role: 'ML Engineer',
    userType: 'Student',
    department: 'Computer Science',
    year: '2026',
    bio: 'Machine learning enthusiast interested in NLP and computer vision.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'OpenCV', 'NLP'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2022 - 2026' },
    ],
  },
  {
    id: '7',
    name: 'Gudimetla Revanth Sai',
    avatar: '',
    role: 'Frontend Developer',
    userType: 'Student',
    department: 'Computer Science and Engineering',
    year: '2025',
    bio: 'Building beautiful UIs with React and React Native.',
    location: 'Vizag, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['React', 'React Native', 'TypeScript', 'CSS', 'Figma'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2021 - 2025' },
    ],
  },
  {
    id: '8',
    name: 'Bhima Pavan Teja',
    avatar: '',
    role: 'DevOps Engineer',
    userType: 'Student',
    department: 'Information Technology',
    year: '2025',
    bio: 'Cloud infrastructure and CI/CD enthusiast.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Linux'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech IT', period: '2021 - 2025' },
    ],
  },
  {
    id: '9',
    name: 'Raghu Airis',
    avatar: '',
    role: 'Product Designer',
    userType: 'Alumni',
    department: 'Design',
    year: '2024',
    bio: 'Creating intuitive digital experiences.',
    location: 'Bangalore, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    experience: [
      { title: 'Product Designer', company: 'Swiggy', period: '2024 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech', period: '2020 - 2024' },
    ],
  },
  {
    id: '10',
    name: 'Sree Venkatanath Ira',
    avatar: '',
    role: 'Mobile Developer',
    userType: 'Student',
    department: 'Computer Science',
    year: '2026',
    bio: 'Building mobile apps with React Native and Flutter.',
    location: 'Vizag, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['React Native', 'Flutter', 'Dart', 'Firebase'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CS', period: '2022 - 2026' },
    ],
  },
  {
    id: '11',
    name: 'Yasarapu Bhanoji Rao',
    avatar: '',
    role: 'Cyber Security',
    userType: 'Student',
    department: 'Computer Science',
    year: '2025',
    bio: 'Cybersecurity researcher and ethical hacker.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Penetration Testing', 'Python', 'Networking', 'Linux'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CS', period: '2021 - 2025' },
    ],
  },
  {
    id: '12',
    name: 'Parchuri Yaswanth',
    avatar: '',
    role: 'Web Developer',
    userType: 'Student',
    department: 'Computer Science',
    year: '2026',
    bio: 'Full-stack web developer with a passion for clean code.',
    location: 'Vizag, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CS', period: '2022 - 2026' },
    ],
  },
];

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Ganesh Tappiti',
  avatar: '',
  role: 'Full Stack Developer',
  userType: 'Student',
  department: 'Computer Science',
  year: '2026',
  bio: 'Passionate about building products that connect people. Currently working on clstr.',
  location: 'Visakhapatnam, India',
  college: 'raghuenggcollege.in',
  connectionStatus: 'none',
  skills: ['React', 'React Native', 'TypeScript', 'Node.js', 'Supabase', 'Expo'],
  experience: [
    { title: 'Full Stack Developer', company: 'clstr Network', period: '2024 - Present' },
    { title: 'Frontend Intern', company: 'TCS', period: '2023 - 2024' },
  ],
  education: [
    { school: 'Raghu Engineering College', degree: 'B.Tech Computer Science', period: '2022 - 2026' },
  ],
};

export const POSTS: Post[] = [
  {
    id: 'p1',
    author: USERS[3],
    content: 'Do participate in this upcoming event "Craft it !" on february 21st conducted by Akruthi Fine Arts Club.\nVenue: SVP Block, Reading room',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    likes: 24,
    comments: 8,
    isLiked: false,
    tags: ['event', 'campus'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p2',
    author: USERS[0],
    content: 'Just shipped a major feature at work! Building real-time collaboration tools is incredibly challenging but rewarding. Anyone else working on similar problems?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    likes: 45,
    comments: 12,
    isLiked: true,
    tags: ['engineering', 'collaboration'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p3',
    author: USERS[4],
    content: 'Hosting a backend development workshop next week. Topics: REST APIs, GraphQL, and microservices architecture. Open to all departments!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    likes: 67,
    comments: 15,
    isLiked: false,
    tags: ['workshop', 'backend'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p4',
    author: USERS[5],
    content: 'Published my research paper on transformer architectures for low-resource Indian languages. Would love feedback from the NLP community here!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    likes: 89,
    comments: 21,
    isLiked: true,
    tags: ['research', 'AI', 'NLP'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p5',
    author: USERS[6],
    content: 'React Native 0.81 is a game changer. The new architecture brings so much performance improvement. Our app startup time dropped by 40%.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    likes: 56,
    comments: 18,
    isLiked: false,
    tags: ['mobile', 'react-native'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p6',
    author: USERS[8],
    content: 'Looking for collaborators on an AI-powered career guidance tool for students. Need ML engineers and mobile developers. DM if interested!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
    likes: 34,
    comments: 9,
    isLiked: false,
    tags: ['collaboration', 'AI'],
    college: 'raghuenggcollege.in',
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    partner: USERS[4],
    lastMessage: 'Good',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    unread: 0,
  },
  {
    id: 'c2',
    partner: USERS[5],
    lastMessage: "Yes, I'd be interested in learning more.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    unread: 0,
  },
  {
    id: 'c3',
    partner: USERS[6],
    lastMessage: 'I would like to connect regarding this item. Item: Mic...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    unread: 1,
  },
  {
    id: 'c4',
    partner: USERS[7],
    lastMessage: 'Thanks for letting me know!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    unread: 0,
  },
  {
    id: 'c5',
    partner: USERS[8],
    lastMessage: "Yes, I'd be interested in learning more.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    unread: 0,
  },
  {
    id: 'c6',
    partner: USERS[9],
    lastMessage: 'I would like to connect regarding this item. Item: Ca...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16),
    unread: 0,
  },
  {
    id: 'c7',
    partner: USERS[10],
    lastMessage: 'Sure, let me check and get back.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18),
    unread: 0,
  },
  {
    id: 'c8',
    partner: USERS[11],
    lastMessage: 'Thanks for the help!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19),
    unread: 0,
  },
];

export const MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', senderId: USERS[4].id, text: 'Hey! How have you been?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
    { id: 'm2', senderId: 'me', text: 'Great! Working on some cool projects. You?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4.5) },
    { id: 'm3', senderId: USERS[4].id, text: 'Same here. Building APIs at my internship.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4.2) },
    { id: 'm4', senderId: 'me', text: 'Nice!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4.1) },
    { id: 'm5', senderId: USERS[4].id, text: 'Good', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
  ],
  c2: [
    { id: 'm6', senderId: 'me', text: 'Hey! I saw your ML project on the feed.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8) },
    { id: 'm7', senderId: USERS[5].id, text: 'Thanks! I have been working on it for a while.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7.5) },
    { id: 'm8', senderId: USERS[5].id, text: "Yes, I'd be interested in learning more.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
  ],
  c3: [
    { id: 'm9', senderId: USERS[6].id, text: 'Hey, I saw your marketplace listing.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9) },
    { id: 'm10', senderId: 'me', text: 'Yes! Which item are you interested in?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8.5) },
    { id: 'm11', senderId: USERS[6].id, text: 'I would like to connect regarding this item. Item: Mic...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8) },
  ],
  c4: [
    { id: 'm12', senderId: 'me', text: 'The event has been rescheduled to next Friday.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15) },
    { id: 'm13', senderId: USERS[7].id, text: 'Thanks for letting me know!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
  ],
};

export const EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Craft It! - Fine Arts Event',
    description: 'Art competition conducted by Akruthi Fine Arts Club. Individual Participation, Multiple Rounds, Limited Time to View & Create.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    location: 'SVP Block, Reading Room',
    organizer: 'Akruthi Fine Arts Club',
    attendees: 120,
    category: 'Arts',
    isRegistered: true,
  },
  {
    id: 'e2',
    title: 'Backend Dev Workshop',
    description: 'Learn REST APIs, GraphQL, and microservices architecture. Hands-on coding session with real-world examples.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    location: 'CS Lab Block A',
    organizer: 'Coding Club',
    attendees: 45,
    category: 'Technology',
    isRegistered: false,
  },
  {
    id: 'e3',
    title: 'Alumni Networking Night',
    description: 'An evening of networking with alumni from top companies. Food and refreshments provided.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    location: 'Grand Hall',
    organizer: 'Alumni Association',
    attendees: 200,
    category: 'Networking',
    isRegistered: false,
  },
  {
    id: 'e4',
    title: 'AI/ML Research Symposium',
    description: 'Presenting research in AI and machine learning. Paper presentations, poster sessions, and panel discussions.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    location: 'Seminar Hall',
    organizer: 'AI Lab',
    attendees: 89,
    category: 'Research',
    isRegistered: true,
  },
  {
    id: 'e5',
    title: 'Startup Pitch Competition',
    description: 'Student startups pitch to a panel of VCs and angel investors. Top 3 teams win seed funding.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    location: 'Innovation Hub',
    organizer: 'E-Cell',
    attendees: 95,
    category: 'Entrepreneurship',
    isRegistered: false,
  },
];
