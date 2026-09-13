export interface AdminRole {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  createdAt?: string;
  permissions?: AdminPermission[];
}

export interface AdminPermission {
  id: string;
  code: string;
  module: string;
  description: string;
  created_at?: string;
}

export interface AdminProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface AdminUserItem {
  id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string;
  profile?: AdminProfile;
  role?: AdminRole;
}

export interface AdminSession {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  role: {
    id: string;
    name: string;
    description: string;
    is_system: boolean;
  };
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuditLogItem {
  id: string;
  admin_id?: string | null;
  admin_user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  admin_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// Phase 2 User Management Types
export interface PetoUserItem {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  location?: string | null;
  verified: boolean;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DEACTIVATED" | "DELETED";
  status_reason?: string | null;
  status_updated_at?: string | null;
  suspended_until?: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_online?: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PetoUserDetail {
  profile: PetoUserItem & {
    bio?: string | null;
    website?: string | null;
    date_of_birth?: string | null;
    cover_url?: string | null;
  };
  auth?: {
    email?: string;
    emailConfirmedAt?: string | null;
    lastSignInAt?: string | null;
    bannedUntil?: string | null;
    createdAt?: string;
  } | null;
  metrics: {
    followersCount: number;
    followingCount: number;
    postsCount: number;
    reelsCount: number;
  };
  adminRole?: {
    adminId: string;
    isActive: boolean;
    roleName: string;
  } | null;
  reports: {
    against: Array<{
      id: string;
      reason: string;
      description: string;
      status: string;
      created_at: string;
      reporter?: { username: string; full_name: string };
    }>;
    filed: Array<{
      id: string;
      reason: string;
      description: string;
      status: string;
      created_at: string;
    }>;
  };
  moderationHistory: AuditLogItem[];
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  verified?: string | boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

// Phase 3 Moderation & Reports Types
export type ReportTargetType = "user" | "post" | "reel" | "comment" | "community";
export type ReportStatus = "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED" | "ESCALATED";
export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PetoReportItem {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_to?: string | null;
  resolution?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  reporter: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
    verified?: boolean;
  };
  assignedModerator?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  resolver?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
}

export interface ModerationMetrics {
  pendingCount: number;
  underReviewCount: number;
  escalatedCount: number;
  resolvedCount: number;
  totalCount: number;
}

export interface PetoReportDetail {
  report: PetoReportItem;
  targetEntity: any;
  moderationHistory: AuditLogItem[];
}

export interface ReportFilters {
  status?: string;
  targetType?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export type ModerationActionType =
  | "REMOVE_POST"
  | "REMOVE_REEL"
  | "REMOVE_COMMENT"
  | "RESTRICT_CONTENT"
  | "WARN_USER"
  | "SUSPEND_USER"
  | "BAN_USER"
  | "RESOLVE_REPORT"
  | "ESCALATE_REPORT"
  | "REJECT_REPORT";

// Phase 4 Dashboard Types
export type DashboardDateRange = "today" | "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    newInPeriod: number;
    growthPct: number;
  };
  content: {
    totalPosts: number;
    postsInPeriod: number;
    totalReels: number;
    totalComments: number;
    commentsInPeriod: number;
    totalCommunities: number;
  };
  engagement: {
    totalLikes: number;
    totalBookmarks: number;
    totalInteractions: number;
    interactionRatePct: string | number;
  };
  moderation: {
    pendingReports: number;
    underReviewReports: number;
    resolvedReports: number;
    highPriorityReports: number;
    resolutionRatePct: number;
  };
  storage: {
    totalBytes: number;
    formattedMB: string;
    formattedGB: string;
    mediaFilesCount: number;
    imagesCount: number;
    videosCount: number;
  };
  monetization: {
    revenueUSD: number;
    activeCampaigns: number;
    pendingAds: number;
    status: string;
  };
}

export interface UserGrowthPoint {
  date: string;
  key: string;
  newUsers: number;
  totalUsers: number;
}

export interface ContentCreationPoint {
  date: string;
  key: string;
  posts: number;
  reels: number;
  comments: number;
  totalContent: number;
}

export interface EngagementPoint {
  date: string;
  key: string;
  likes: number;
  comments: number;
  bookmarks: number;
  totalInteractions: number;
}

export interface ReportsTrendPoint {
  date: string;
  key: string;
  reports: number;
  resolved: number;
}

export interface DashboardTrends {
  userGrowth: UserGrowthPoint[];
  contentCreation: ContentCreationPoint[];
  engagement: EngagementPoint[];
  reports: ReportsTrendPoint[];
}

export interface SystemHealthService {
  name: string;
  status: string;
  latencyMs?: number;
  sizeMB?: string;
  active?: boolean;
}

export interface SystemHealthData {
  status: "OPTIMAL" | "DEGRADED";
  dbLatencyMs: number;
  uptimeSeconds: number;
  uptimeFormatted: string;
  memory: {
    usedMB: number;
    totalMB: number;
    pct: number;
    systemFreeMemPct: number;
  };
  platform: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  services: SystemHealthService[];
}

export interface DashboardWidgets {
  pendingReports: PetoReportItem[];
  recentAdminActions: AuditLogItem[];
  recentUsers: PetoUserItem[];
  systemHealth: SystemHealthData;
}

export interface DashboardOverviewData {
  meta: {
    range: string;
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
  metrics: DashboardMetrics;
  trends: DashboardTrends;
  widgets: DashboardWidgets;
  cached?: boolean;
  cacheAgeSeconds?: number;
}

// ==============================================================
// PHASE 5: ANALYTICS & INTELLIGENCE TYPES
// ==============================================================

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export interface AnalyticsOverviewData {
  summary: {
    totalUsers: number;
    activeUsersPeriod: number;
    newUsersPeriod: number;
    totalPosts: number;
    totalReels: number;
    totalComments: number;
    totalCommunities: number;
    estimatedStorageMB: number;
    periodLikes: number;
    periodComments: number;
    periodBookmarks: number;
  };
  growthTrend: Array<{
    date: string;
    newUsers: number;
    newPosts: number;
    newReels: number;
    interactions: number;
  }>;
  activitySummary: {
    periodLikes: number;
    periodComments: number;
    periodBookmarks: number;
  };
}

export interface UserAnalyticsData {
  metrics: {
    totalUsers: number;
    newUsersPeriod: number;
    dau: number;
    wau: number;
    mau: number;
    activeUsers: number;
    deletedAccounts: number;
    suspendedAccounts: number;
    bannedAccounts: number;
  };
  trends: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
  }>;
  platformDistribution: Array<{
    platform: string;
    count: number;
    percentage: number;
  }>;
  geographicDistribution: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export interface EngagementAnalyticsData {
  totals: {
    likes: number;
    comments: number;
    follows: number;
    bookmarks: number;
    postViews: number;
    reelViews: number;
    reelWatchTimeSeconds: number;
    avgWatchTimePerReelSeconds: number;
  };
  trends: Array<{
    date: string;
    likes: number;
    comments: number;
    follows: number;
    bookmarks: number;
    interactions: number;
  }>;
  breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface TopCreator {
  authorId: string;
  author: {
    username?: string;
    full_name?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
  postCount: number;
  totalLikes: number;
}

export interface ContentAnalyticsData {
  metrics: {
    totalPosts: number;
    totalReels: number;
    postsPerDay: number;
    reelsPerDay: number;
    mediaCount: number;
    imageCount: number;
    videoCount: number;
  };
  mediaDistribution: {
    images: number;
    videos: number;
    ratio: string;
  };
  topCreators: TopCreator[];
  trends: Array<{
    date: string;
    posts: number;
    reels: number;
  }>;
}

export interface TopReelItem {
  id: string;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  author?: {
    username?: string;
    full_name?: string;
  };
}

export interface ReelsAnalyticsData {
  metrics: {
    totalReels: number;
    totalViews: number;
    totalWatchTimeSeconds: number;
    avgWatchTimeSeconds: number;
    completionRatePct: number;
  };
  trends: Array<{
    date: string;
    views: number;
    reelsCreated: number;
  }>;
  topReels: TopReelItem[];
}

export interface TopCommunityItem {
  id: string;
  name: string;
  memberCount: number;
  postCount: number;
}

export interface CommunitiesAnalyticsData {
  metrics: {
    totalCommunities: number;
    totalMemberships: number;
    activeCommunitiesCount: number;
    avgMembersPerCommunity: number;
  };
  topCommunities: TopCommunityItem[];
  trends: Array<{
    date: string;
    newCommunities: number;
    newMembers: number;
  }>;
}

export interface RetentionCohort {
  cohortWeek: string;
  cohortSize: number;
  d1Pct: number;
  d7Pct: number;
  d14Pct: number;
  d30Pct: number;
}

export interface RetentionAnalyticsData {
  cohorts: RetentionCohort[];
  averages: {
    d1: number;
    d7: number;
    d14: number;
    d30: number;
  };
}

export interface RevenueAnalyticsData {
  readiness: {
    adsEngineReady: boolean;
    stripeReady: boolean;
    paywallReady: boolean;
  };
  estimates: {
    totalAudience: number;
    estimatedMonetizableDAU: number;
    estimatedRPM: number;
    estimatedMonthlyRevenueUSD: number;
    estimatedARPU: number;
  };
  projections: Array<{
    month: string;
    projectedDAU: number;
    projectedRevenueUSD: number;
  }>;
}

// ==============================================================
// PHASE 6: SYSTEM MANAGEMENT, TELEMETRY & FEATURE FLAGS
// ==============================================================

export interface ServiceHealthItem {
  id: string;
  name: string;
  category: "core" | "infrastructure" | "processing" | "communication";
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  details: string;
  lastChecked: string;
}

export interface SystemHealthReport {
  overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  services: ServiceHealthItem[];
  uptimeSeconds: number;
  uptimeFormatted: string;
  systemMemory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  nodeVersion: string;
  platform: string;
  generatedAt: string;
}

export interface EndpointMetric {
  path: string;
  method: string;
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  lastStatus: number;
}

export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface ApiTelemetryMetrics {
  summary: {
    totalRequests: number;
    errorRatePct: number;
    status2xx: number;
    status3xx: number;
    status4xx: number;
    status5xx: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    uptimeSeconds: number;
    uptimeFormatted: string;
  };
  slowEndpoints: EndpointMetric[];
  recentRequests: RequestLogEntry[];
}

export interface StorageAnalyticsData {
  totalStorageBytes: number;
  totalStorageFormatted: string;
  images: {
    count: number;
    bytes: number;
    formatted: string;
    percentage: number;
  };
  videos: {
    count: number;
    bytes: number;
    formatted: string;
    percentage: number;
  };
  thumbnails: {
    count: number;
    bytes: number;
    formatted: string;
    percentage: number;
  };
  failedUploads: {
    count: number;
    items: Array<{
      id: string;
      type: string;
      createdAt: string;
      reason: string;
    }>;
  };
  buckets: Array<{
    name: string;
    isPublic: boolean;
    fileSizeLimitMB: number | null;
    createdAt?: string;
  }>;
}

export interface FeatureFlagItem {
  id: string;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    user?: {
      username?: string;
      full_name?: string;
    };
  } | null;
  updater?: {
    user?: {
      username?: string;
      full_name?: string;
    };
  } | null;
}

export interface MaintenanceModeState {
  is_enabled: boolean;
  message: string;
  enabled_at: string | null;
  allowed_ips: string[];
}



