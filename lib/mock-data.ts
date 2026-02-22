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

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false });
}

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Epu Sri Ram',
  avatar: '',
  role: 'Full-stack Developer',
  userType: 'Student',
  department: 'Computer Science and Engineering',
  year: '2026',
  bio: "Full-stack developer, student innovator, and startup enthusiast.",
  location: 'Visakhapatnam, India',
  college: 'raghuenggcollege.in',
  connectionStatus: 'connected',
  skills: ['React', 'Node.js', 'Python', 'AWS', 'TypeScript'],
  experience: [
    { title: 'Full Stack Developer', company: 'Freelance', period: '2024 - Present' },
  ],
  education: [
    { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2022 - 2026' },
  ],
};

export const USERS: User[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
    name: 'Gudivada Sri Vidya',
    avatar: '',
    role: 'Event Coordinator',
    userType: 'Student',
    department: 'Computer Science',
    year: '2026',
    bio: 'Active in campus clubs and events. Passionate about bringing the community together.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Event Planning', 'Communication', 'Leadership'],
    experience: [],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CS', period: '2022 - 2026' },
    ],
  },
  {
    id: '4',
    name: 'Ankit Sharma',
    avatar: '',
    role: 'ML Engineer',
    userType: 'Alumni',
    department: 'Information Technology',
    year: '2022',
    bio: 'Machine learning engineer with a passion for NLP and computer vision.',
    location: 'Bangalore, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'connected',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP'],
    experience: [
      { title: 'ML Engineer', company: 'Infosys', period: '2022 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech IT', period: '2018 - 2022' },
    ],
  },
  {
    id: '5',
    name: 'Priya Reddy',
    avatar: '',
    role: 'Product Designer',
    userType: 'Alumni',
    department: 'Electronics and Communication',
    year: '2021',
    bio: 'Designing user-centric products at scale. Previously at Zoho.',
    location: 'Chennai, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'none',
    skills: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'],
    experience: [
      { title: 'Product Designer', company: 'Freshworks', period: '2023 - Present' },
      { title: 'UI/UX Designer', company: 'Zoho', period: '2021 - 2023' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech ECE', period: '2017 - 2021' },
    ],
  },
  {
    id: '6',
    name: 'Dr. Ramesh Kumar',
    avatar: '',
    role: 'Professor - AI & ML',
    userType: 'Faculty',
    department: 'Computer Science and Engineering',
    year: '',
    bio: 'Research interests in deep learning and intelligent systems. PhD from IIT Madras.',
    location: 'Visakhapatnam, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'none',
    skills: ['Deep Learning', 'Research', 'Published Papers'],
    experience: [
      { title: 'Professor', company: 'Raghu Engineering College', period: '2015 - Present' },
    ],
    education: [
      { school: 'IIT Madras', degree: 'PhD Computer Science', period: '2010 - 2015' },
    ],
  },
  {
    id: '7',
    name: 'Kavya Nair',
    avatar: '',
    role: 'Cloud Architect',
    userType: 'Alumni',
    department: 'Computer Science and Engineering',
    year: '2020',
    bio: 'AWS certified solutions architect. Building scalable cloud infrastructure.',
    location: 'Mumbai, India',
    college: 'raghuenggcollege.in',
    connectionStatus: 'none',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'DevOps'],
    experience: [
      { title: 'Cloud Architect', company: 'Wipro', period: '2022 - Present' },
    ],
    education: [
      { school: 'Raghu Engineering College', degree: 'B.Tech CSE', period: '2016 - 2020' },
    ],
  },
];

export const POSTS: Post[] = [
  {
    id: 'p1',
    author: USERS[0],
    content: 'Just completed my first open-source contribution! The feeling of seeing your code merged into a large project is incredible. Keep pushing, everyone!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 24,
    comments: 8,
    isLiked: false,
    tags: ['opensource', 'coding'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p2',
    author: USERS[4],
    content: 'Excited to share that I\'ve been promoted to Senior Product Designer at Freshworks! Grateful for the mentorship from Raghu Engineering alumni who guided me through my career journey.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    likes: 67,
    comments: 15,
    isLiked: true,
    tags: ['career', 'design'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p3',
    author: USERS[5],
    content: 'Our AI lab has published a new paper on transformer architectures for regional language processing. Proud of the student researchers who contributed. Link in comments.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    likes: 42,
    comments: 6,
    isLiked: false,
    tags: ['research', 'AI'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p4',
    author: USERS[2],
    content: 'Looking for teammates for the upcoming hackathon! We need a backend developer and a UI/UX designer. DM me if interested.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    likes: 18,
    comments: 12,
    isLiked: false,
    tags: ['hackathon', 'teamup'],
    college: 'raghuenggcollege.in',
  },
  {
    id: 'p5',
    author: USERS[3],
    content: 'Tip for freshers: Start building projects early. Don\'t wait for the perfect idea. Ship fast, learn faster. My GitHub is full of half-finished projects that taught me more than any course.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    likes: 89,
    comments: 22,
    isLiked: true,
    tags: ['advice', 'career'],
    college: 'raghuenggcollege.in',
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    partner: USERS[0],
    lastMessage: 'Sure, I can help you with the React project. Let me check the repo.',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    unread: 2,
  },
  {
    id: 'c2',
    partner: USERS[2],
    lastMessage: 'The event details have been finalized. Check the updated schedule.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    unread: 0,
  },
  {
    id: 'c3',
    partner: USERS[3],
    lastMessage: 'Thanks for the ML resources! I\'ll go through them this weekend.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    unread: 1,
  },
  {
    id: 'c4',
    partner: USERS[4],
    lastMessage: 'Would love to collaborate on the design system. Let\'s set up a call.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: 0,
  },
  {
    id: 'c5',
    partner: USERS[6],
    lastMessage: 'The AWS certification study group starts next Monday.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    unread: 0,
  },
];

export const MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', senderId: USERS[0].id, text: 'Hey! Can you help me with a React project?', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { id: 'm2', senderId: 'me', text: 'Of course! What do you need help with?', timestamp: new Date(Date.now() - 1000 * 60 * 25) },
    { id: 'm3', senderId: USERS[0].id, text: 'I\'m having trouble with state management in a large app. Redux vs Context?', timestamp: new Date(Date.now() - 1000 * 60 * 20) },
    { id: 'm4', senderId: 'me', text: 'For most cases, React Query + Context works great. Redux is overkill unless you have very complex client state.', timestamp: new Date(Date.now() - 1000 * 60 * 18) },
    { id: 'm5', senderId: USERS[0].id, text: 'That makes sense. Can you share any examples?', timestamp: new Date(Date.now() - 1000 * 60 * 16) },
    { id: 'm6', senderId: USERS[0].id, text: 'Sure, I can help you with the React project. Let me check the repo.', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  ],
  c2: [
    { id: 'm7', senderId: 'me', text: 'Hi! Are the event details ready?', timestamp: new Date(Date.now() - 1000 * 60 * 90) },
    { id: 'm8', senderId: USERS[2].id, text: 'The event details have been finalized. Check the updated schedule.', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  ],
  c3: [
    { id: 'm9', senderId: 'me', text: 'Here are some great ML resources for beginners.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6) },
    { id: 'm10', senderId: USERS[3].id, text: 'Thanks for the ML resources! I\'ll go through them this weekend.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  ],
  c4: [
    { id: 'm11', senderId: USERS[4].id, text: 'I saw your portfolio work. Really impressive!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25) },
    { id: 'm12', senderId: 'me', text: 'Thank you! I\'d love to get your design feedback.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24.5) },
    { id: 'm13', senderId: USERS[4].id, text: 'Would love to collaborate on the design system. Let\'s set up a call.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  ],
  c5: [
    { id: 'm14', senderId: USERS[6].id, text: 'The AWS certification study group starts next Monday.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  ],
};

export const EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Cultural Night 2026',
    description: 'Annual cultural fest with performances, art exhibitions, and food stalls. A celebration of creativity and talent.',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    location: 'Main Auditorium',
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
