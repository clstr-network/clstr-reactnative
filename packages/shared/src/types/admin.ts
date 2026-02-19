// Admin Dashboard Types

export interface AdminUser {
  id: string;
  email: string;
  role: 'founder' | 'admin' | 'moderator';
  name?: string;
  addedAt: Date;
  addedBy: string;
}

// The founder email - this user has full access and can manage other admins
export const FOUNDER_EMAIL = '2005ganesh16@gmail.com';


export interface KPICard {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  route?: string;
  icon?: string;
}

export interface College {
  id: string;
  name: string;
  city: string;
  country: string;
  usersCount: number;
  alumniCount: number;
  domainsCount: number;
  status: 'verified' | 'unverified' | 'flagged';
  firstDetected: Date;
  confidenceScore: number;
  domains: Domain[];
  engagementStats?: {
    postsPerWeek: number;
    reelsPerWeek: number;
    alumniInteractionRatio: number;
    clubActivity: number;
  };
}

export interface Domain {
  id: string;
  domain: string;
  collegeId?: string;
  collegeName?: string;
  userCount: number;
  firstSeen: Date;
  status: 'approved' | 'unknown' | 'blocked';
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Club';
  college: string;
  graduationYear?: number;
  activityScore: number;
  accountStatus: 'active' | 'suspended' | 'pending';
  skills: string[];
  clubsInvolved: string[];
  projectsContributed: string[];
  createdAt: Date;
  lastActive?: Date;
}

export interface TalentNode {
  id: string;
  type: 'user' | 'club' | 'project' | 'company';
  name: string;
  metadata: Record<string, unknown>;
}

export interface TalentEdge {
  source: string;
  target: string;
  type: 'mentorship' | 'leadership' | 'collaboration';
  weight?: number;
}

export interface TalentGraphData {
  nodes: TalentNode[];
  edges: TalentEdge[];
}

export interface RecruiterAccount {
  id: string;
  companyName: string;
  planType: 'free' | 'basic' | 'pro' | 'enterprise';
  activeSearches: number;
  messagesSent: number;
  conversionRate: number;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  subscription?: {
    startDate: Date;
    endDate: Date;
    price: number;
  };
}

export interface CollabProject {
  id: string;
  title: string;
  companyName: string;
  colleges: string[];
  applicants: number;
  status: 'open' | 'in_progress' | 'completed' | 'archived';
  outcome?: 'hire' | 'internship' | 'none';
  industry: string;
  roles: string[];
  createdAt: Date;
  completionRate?: number;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
  createdAt: Date;
  read: boolean;
}

export interface AnalyticsData {
  userGrowth: {
    date: string;
    signups: number;
    activeUsers: number;
  }[];
  alumniVsStudent: {
    alumni: number;
    student: number;
  };
  engagementByCollege: {
    college: string;
    engagement: number;
  }[];
  featureUsage: {
    feature: string;
    usage: number;
  }[];
  retentionCohorts: {
    cohort: string;
    retention: number[];
  }[];
}

export interface ReportConfig {
  id: string;
  name: string;
  metric: string;
  geography?: string;
  timeRange: '7d' | '30d' | '90d' | '1y' | 'all';
  aggregationLevel: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface AdminSettings {
  adminUsers: AdminUser[];
  dataAnonymizationRules: {
    minAggregationSize: number;
    excludeFields: string[];
  };
  exportThresholds: {
    maxRecords: number;
    requireApproval: boolean;
  };
  notificationRules: {
    newDomainAlert: boolean;
    activityThreshold: number;
    spamDetection: boolean;
  };
}

// Navigation items for admin sidebar
export interface AdminNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', route: '/admin' },
  { id: 'colleges', label: 'Colleges', icon: 'GraduationCap', route: '/admin/colleges' },
  { id: 'domains', label: 'Domains', icon: 'Globe', route: '/admin/domains' },
  { id: 'users', label: 'Users', icon: 'Users', route: '/admin/users' },
  { id: 'alumni-invites', label: 'Alumni Invites', icon: 'UserPlus', route: '/admin/alumni-invites' },
  { id: 'talent-graph', label: 'Talent Graph', icon: 'Network', route: '/admin/talent-graph' },
  { id: 'recruiters', label: 'Recruiters', icon: 'Briefcase', route: '/admin/recruiters' },
  { id: 'collabhub', label: 'CollabHub', icon: 'Folder', route: '/admin/collabhub' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/admin/analytics' },
  { id: 'reports', label: 'Reports', icon: 'FileText', route: '/admin/reports' },
  { id: 'settings', label: 'Settings', icon: 'Settings', route: '/admin/settings' },
];
