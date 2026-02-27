import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { ReactionType } from '@/lib/api';

const STORAGE_KEY = 'clstr_mock_social_data_v1';
const MOCK_USER_ID = 'mock-user-001';
const MOCK_COLLEGE_DOMAIN = 'mock.dev';

const firstNames = ['Aarav', 'Isha', 'Rohan', 'Neha', 'Kabir', 'Ananya', 'Dev', 'Maya', 'Arjun', 'Sara', 'Nikhil', 'Meera'];
const lastNames = ['Sharma', 'Patel', 'Verma', 'Iyer', 'Reddy', 'Mehta', 'Nair', 'Singh', 'Gupta', 'Rao'];
const roles = ['Student', 'Student', 'Student', 'Alumni', 'Faculty', 'Student', 'Student', 'Alumni'];
const departments = ['Computer Science', 'Data Science', 'Electronics', 'Mechanical', 'Business', 'Design'];

export interface MockProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  college_domain: string;
  bio: string;
  headline: string;
  major: string;
  university: string;
}

export interface MockPost {
  id: string;
  user_id: string;
  content: string;
  images: string[] | null;
  college_domain: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  reposts_count: number;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    college_domain: string;
    bio?: string;
    headline?: string;
  };
  user_reaction: ReactionType | null;
  is_saved: boolean;
  reposted: boolean;
}

export interface MockConnection {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  headline: string;
  bio: string;
  college_domain: string;
}

export interface MockEvent {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  is_virtual: boolean;
  college_domain: string;
  created_at: string;
  category: string;
  attendees_count: number;
  max_attendees: number;
  is_registered: boolean;
}

export interface MockClub {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string;
  bio: string;
  followers_count: number;
  is_following: boolean;
}

export interface MockSharedItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  image: string | null;
  share_type: 'donate' | 'sell' | 'rent';
  category: string;
  status: 'available' | 'reserved' | 'completed';
  created_at: string;
}

export interface MockItemRequest {
  id: string;
  user_id: string;
  item: string;
  description: string;
  preference: string;
  urgency: string;
  created_at: string;
}

interface MockStore {
  profile: MockProfile;
  posts: MockPost[];
  connections: MockConnection[];
  events: MockEvent[];
  clubs: MockClub[];
  ecoItems: MockSharedItem[];
  ecoRequests: MockItemRequest[];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomName() {
  return `${firstNames[rand(0, firstNames.length - 1)]} ${lastNames[rand(0, lastNames.length - 1)]}`;
}

function avatarFor(seed: number) {
  return `https://i.pravatar.cc/150?img=${(seed % 50) + 1}`;
}

function makeId(prefix: string) {
  return `${prefix}_${Crypto.randomUUID()}`;
}

function buildSeed(): MockStore {
  const now = Date.now();

  const profile: MockProfile = {
    id: MOCK_USER_ID,
    full_name: 'Mock User',
    avatar_url: avatarFor(1),
    role: 'Student',
    college_domain: MOCK_COLLEGE_DOMAIN,
    bio: 'Testing Clstr mock mode with realistic local data.',
    headline: 'Final Year CS • Open Source Enthusiast',
    major: 'Computer Science',
    university: 'Mock University',
  };

  const connections: MockConnection[] = Array.from({ length: 18 }).map((_, index) => {
    const name = randomName();
    return {
      id: `mock-conn-${index + 1}`,
      full_name: name,
      avatar_url: avatarFor(index + 3),
      role: roles[index % roles.length],
      headline: `${departments[index % departments.length]} • ${(index % 4) + 1}yr`,
      bio: `${name} is active in campus communities and networking events.`,
      college_domain: MOCK_COLLEGE_DOMAIN,
    };
  });

  const postPrompts = [
    'Built a small app prototype for campus room sharing today.',
    'Looking for teammates for a sustainability-focused hackathon.',
    'Sharing my notes from today\'s distributed systems lecture.',
    'Open to internship referrals for frontend roles this summer.',
    'Hosting a weekend DSA practice session in the library.',
    'Excited about our eco-drive campaign this month!',
  ];

  const posts: MockPost[] = Array.from({ length: 24 }).map((_, index) => {
    const isMine = index % 4 === 0;
    const author = isMine ? profile : connections[index % connections.length];
    return {
      id: `mock-post-${index + 1}`,
      user_id: author.id,
      content: `${postPrompts[index % postPrompts.length]} #${index + 1}`,
      images: null,
      college_domain: MOCK_COLLEGE_DOMAIN,
      likes_count: rand(3, 120),
      comments_count: rand(0, 24),
      shares_count: rand(0, 12),
      reposts_count: rand(0, 6),
      created_at: new Date(now - index * 1000 * 60 * 42).toISOString(),
      updated_at: new Date(now - index * 1000 * 60 * 40).toISOString(),
      profile: author,
      user_reaction: null,
      is_saved: index % 5 === 0,
      reposted: false,
    };
  });

  const eventTitles = ['AI Study Jam', 'Career Fair Prep', 'Design Sprint Meetup', 'EcoCampus Swap Day', 'Alumni Q&A'];
  const events: MockEvent[] = Array.from({ length: 10 }).map((_, index) => ({
    id: `mock-event-${index + 1}`,
    creator_id: connections[index % connections.length].id,
    title: eventTitles[index % eventTitles.length],
    description: 'Mock event for testing schedule, RSVP, and event UI state.',
    event_date: new Date(now + (index + 1) * 1000 * 60 * 60 * 24).toISOString(),
    event_time: `${10 + (index % 7)}:00`,
    location: index % 3 === 0 ? 'Virtual' : `Campus Hall ${index + 1}`,
    is_virtual: index % 3 === 0,
    college_domain: MOCK_COLLEGE_DOMAIN,
    created_at: new Date(now - index * 1000 * 60 * 60).toISOString(),
    category: ['Academic', 'Career', 'Social', 'Workshop'][index % 4],
    attendees_count: rand(20, 180),
    max_attendees: rand(120, 300),
    is_registered: index % 3 === 0,
  }));

  const clubs: MockClub[] = Array.from({ length: 8 }).map((_, index) => ({
    id: `mock-club-${index + 1}`,
    full_name: ['Coding Club', 'Green Campus', 'Robotics Circle', 'Design Guild', 'Career Launchpad', 'Public Speaking', 'Data Guild', 'Startup Lab'][index],
    avatar_url: avatarFor(index + 20),
    headline: 'Student Community',
    bio: 'Mock club profile for testing follow flows and discovery.',
    followers_count: rand(40, 420),
    is_following: index % 2 === 0,
  }));

  const ecoItems: MockSharedItem[] = Array.from({ length: 12 }).map((_, index) => ({
    id: `mock-eco-item-${index + 1}`,
    user_id: index % 4 === 0 ? MOCK_USER_ID : connections[index % connections.length].id,
    title: ['Old Laptop Stand', 'Course Notes Bundle', 'Desk Lamp', 'Bicycle Helmet', 'Calculator'][index % 5],
    description: 'Reusable item listed in EcoCampus mock dataset.',
    image: null,
    share_type: (['donate', 'sell', 'rent'] as const)[index % 3],
    category: ['Electronics', 'Books', 'Home', 'Sports'][index % 4],
    status: (['available', 'available', 'reserved'] as const)[index % 3],
    created_at: new Date(now - index * 1000 * 60 * 120).toISOString(),
  }));

  const ecoRequests: MockItemRequest[] = Array.from({ length: 10 }).map((_, index) => ({
    id: `mock-eco-req-${index + 1}`,
    user_id: connections[index % connections.length].id,
    item: ['Second-hand monitor', 'Reference books', 'Cycle for commute', 'Lab coat', 'Whiteboard'][index % 5],
    description: 'Mock request to test EcoCampus requests tab.',
    preference: ['Good condition', 'Budget friendly', 'Any'][index % 3],
    urgency: ['low', 'normal', 'high'][index % 3],
    created_at: new Date(now - index * 1000 * 60 * 180).toISOString(),
  }));

  return { profile, posts, connections, events, clubs, ecoItems, ecoRequests };
}

async function readStore(): Promise<MockStore | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockStore;
  } catch {
    return null;
  }
}

async function writeStore(store: MockStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function ensureStore(): Promise<MockStore> {
  const existing = await readStore();
  if (existing) return existing;
  const seeded = buildSeed();
  await writeStore(seeded);
  return seeded;
}

export async function getMockProfileData() {
  const store = await ensureStore();
  return store.profile;
}

export async function getMockConnectionsData() {
  const store = await ensureStore();
  return store.connections;
}

export async function getMockConnectionCountData() {
  const store = await ensureStore();
  return store.connections.length;
}

export async function getMockProfileViewsCountData() {
  return 137;
}

export async function getMockPostsData(params?: { page?: number; limit?: number; category?: string; sort?: string }) {
  const store = await ensureStore();
  const page = params?.page ?? 0;
  const limit = params?.limit ?? 20;
  const start = page * limit;
  const end = start + limit;
  return store.posts.slice(start, end);
}

export async function getMockPostByIdData(postId: string) {
  const store = await ensureStore();
  return store.posts.find((post) => post.id === postId) ?? null;
}

export async function getMockPostsByUserData(userId: string, params?: { cursor?: string | null; pageSize?: number }) {
  const store = await ensureStore();
  const pageSize = params?.pageSize ?? 10;
  let userPosts = store.posts.filter((post) => post.user_id === userId);
  if (params?.cursor) {
    userPosts = userPosts.filter((post) => post.created_at < params.cursor!);
  }
  const sliced = userPosts.slice(0, pageSize + 1);
  const hasMore = sliced.length > pageSize;
  const posts = sliced.slice(0, pageSize);
  const nextCursor = hasMore ? posts[posts.length - 1]?.created_at ?? null : null;
  return { posts, hasMore, nextCursor };
}

export async function getMockUserPostsCountData(userId: string) {
  const store = await ensureStore();
  return store.posts.filter((post) => post.user_id === userId).length;
}

export async function toggleMockReactionData(postId: string, reactionType: ReactionType) {
  const store = await ensureStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) return { action: 'removed' as const, reactionType };

  if (post.user_reaction === reactionType) {
    post.user_reaction = null;
    post.likes_count = Math.max(0, post.likes_count - 1);
    await writeStore(store);
    return { action: 'removed' as const, reactionType };
  }

  if (!post.user_reaction) {
    post.likes_count += 1;
    post.user_reaction = reactionType;
    await writeStore(store);
    return { action: 'added' as const, reactionType };
  }

  post.user_reaction = reactionType;
  await writeStore(store);
  return { action: 'changed' as const, reactionType };
}

export async function toggleMockSavePostData(postId: string) {
  const store = await ensureStore();
  const post = store.posts.find((item) => item.id === postId);
  if (post) {
    post.is_saved = !post.is_saved;
    await writeStore(store);
  }
  return { success: true };
}

export async function voteMockPollData() {
  return { success: true };
}

export async function createMockRepostData(postId: string) {
  const store = await ensureStore();
  const post = store.posts.find((item) => item.id === postId);
  if (post && !post.reposted) {
    post.reposted = true;
    post.reposts_count += 1;
    await writeStore(store);
  }
  return { success: true, repostId: makeId('repost'), hasCommentary: false };
}

export async function deleteMockRepostData(postId: string) {
  const store = await ensureStore();
  const post = store.posts.find((item) => item.id === postId);
  if (post && post.reposted) {
    post.reposted = false;
    post.reposts_count = Math.max(0, post.reposts_count - 1);
    await writeStore(store);
  }
  return true;
}

export async function getMockEventsData() {
  const store = await ensureStore();
  return store.events;
}

export async function toggleMockEventRegistrationData(eventId: string) {
  const store = await ensureStore();
  const event = store.events.find((entry) => entry.id === eventId);
  if (!event) return { registered: false };
  event.is_registered = !event.is_registered;
  event.attendees_count += event.is_registered ? 1 : -1;
  await writeStore(store);
  return { registered: event.is_registered };
}

export async function getMockClubsData() {
  const store = await ensureStore();
  return store.clubs;
}

export async function followMockClubData(clubId: string) {
  const store = await ensureStore();
  const club = store.clubs.find((entry) => entry.id === clubId);
  if (club && !club.is_following) {
    club.is_following = true;
    club.followers_count += 1;
    await writeStore(store);
  }
  return { success: true };
}

export async function unfollowMockClubData(clubId: string) {
  const store = await ensureStore();
  const club = store.clubs.find((entry) => entry.id === clubId);
  if (club && club.is_following) {
    club.is_following = false;
    club.followers_count = Math.max(0, club.followers_count - 1);
    await writeStore(store);
  }
  return { success: true };
}

export async function getMockEcoItemsData() {
  const store = await ensureStore();
  return store.ecoItems;
}

export async function getMockEcoRequestsData() {
  const store = await ensureStore();
  return store.ecoRequests;
}

export async function getMockMyEcoItemsData(userId: string) {
  const store = await ensureStore();
  return store.ecoItems.filter((item) => item.user_id === userId);
}

export async function createMockEcoIntentData() {
  return { success: true };
}

export async function deleteMockEcoItemData(itemId: string) {
  const store = await ensureStore();
  store.ecoItems = store.ecoItems.filter((item) => item.id !== itemId);
  await writeStore(store);
  return { success: true };
}

export async function createMockEcoItemData(input: {
  title: string;
  description?: string;
  category?: string;
  share_type?: 'donate' | 'sell' | 'rent';
}) {
  const store = await ensureStore();
  const newItem: MockSharedItem = {
    id: makeId('mock-eco-item'),
    user_id: MOCK_USER_ID,
    title: input.title,
    description: input.description ?? '',
    image: null,
    share_type: input.share_type ?? 'donate',
    category: input.category ?? 'General',
    status: 'available',
    created_at: new Date().toISOString(),
  };
  store.ecoItems = [newItem, ...store.ecoItems];
  await writeStore(store);
  return newItem;
}

export async function createMockEcoRequestData(input: { item: string; description?: string; urgency?: string; preference?: string }) {
  const store = await ensureStore();
  const request: MockItemRequest = {
    id: makeId('mock-eco-req'),
    user_id: MOCK_USER_ID,
    item: input.item,
    description: input.description ?? '',
    urgency: input.urgency ?? 'normal',
    preference: input.preference ?? '',
    created_at: new Date().toISOString(),
  };
  store.ecoRequests = [request, ...store.ecoRequests];
  await writeStore(store);
  return request;
}

export async function checkMockConnectionStatusData(targetId: string) {
  const store = await ensureStore();
  return store.connections.some((entry) => entry.id === targetId) ? 'connected' : 'none';
}

export async function sendMockConnectionRequestData(_targetId: string) {
  return { id: makeId('mock-conn-request'), status: 'pending' as const };
}

export async function removeMockConnectionData(targetId: string) {
  const store = await ensureStore();
  store.connections = store.connections.filter((entry) => entry.id !== targetId);
  await writeStore(store);
  return { success: true };
}

export async function countMockMutualConnectionsData() {
  return rand(1, 12);
}

export async function getMockProfileByIdData(userId: string) {
  const store = await ensureStore();
  if (userId === MOCK_USER_ID) return store.profile;
  const person = store.connections.find((entry) => entry.id === userId);
  if (!person) return null;
  return {
    id: person.id,
    full_name: person.full_name,
    avatar_url: person.avatar_url,
    role: person.role,
    college_domain: person.college_domain,
    bio: person.bio,
    headline: person.headline,
    major: departments[rand(0, departments.length - 1)],
    university: 'Mock University',
  };
}
