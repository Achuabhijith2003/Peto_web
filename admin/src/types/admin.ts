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

// ============================================================
// COMPLIANCE TYPES (PHASE 7)
// ============================================================

export type CompliancePolicyType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "COMMUNITY_GUIDELINES"
  | "CONTENT_POLICY"
  | "ADVERTISING_POLICY"
  | "COOKIE_POLICY";

export type CompliancePolicyStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "ARCHIVED";

export interface CompliancePolicyItem {
  id: string;
  policy_type: CompliancePolicyType;
  slug?: string | null;
  title: string;
  version: string;
  status: CompliancePolicyStatus;
  content: string;
  summary_of_changes?: string | null;
  effective_date?: string | null;
  published_at?: string | null;
  published_by?: string | null;
  superseded_policy_id?: string | null;
  requires_acknowledgement?: boolean;
  region_code?: string;
  pdf_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username?: string;
    full_name?: string;
  } | null;
  publisher?: {
    id: string;
    username?: string;
    full_name?: string;
  } | null;
}

export type DataRequestType =
  | "DATA_ACCESS"
  | "DATA_EXPORT"
  | "ACCOUNT_DELETION"
  | "DATA_CORRECTION"
  | "PRIVACY_REQUEST";

export type DataRequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";

export interface ComplianceDataRequestItem {
  id: string;
  user_id?: string | null;
  request_type: DataRequestType;
  status: DataRequestStatus;
  details?: string | null;
  verification_status?: string | null;
  resolution_notes?: string | null;
  processed_by?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  processor?: {
    id: string;
    username?: string;
    full_name?: string;
  } | null;
}

export type RetentionCategory =
  | "DELETED_USERS"
  | "DELETED_POSTS"
  | "DELETED_MEDIA"
  | "REPORTS"
  | "MODERATION_RECORDS"
  | "AUDIT_LOGS";

export interface ComplianceRetentionPolicyItem {
  id?: string;
  category: RetentionCategory;
  name: string;
  retention_days: number;
  description: string;
  legal_basis: string;
  auto_purge_enabled: boolean;
  updated_by?: string | null;
  updated_at?: string;
  updater?: {
    id: string;
    username?: string;
    full_name?: string;
  } | null;
}

// ============================================================
// PHASE 8: ADVERTISING PLATFORM TYPES
// ============================================================

export type AdvertiserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

export interface AdvertiserItem {
  id: string;
  user_id?: string | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  website_url?: string | null;
  industry?: string;
  currency?: string;
  status: AdvertiserStatus;
  total_spend: number;
  balance: number;
  campaign_count?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  ad_campaigns?: AdCampaignItem[];
}

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "CONVERSIONS"
  | "APP_PROMOTION";

export type CampaignStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type CreativeFormat = "IMAGE" | "VIDEO" | "CAROUSEL" | "SPONSORED_POST";

export type CreativeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export interface AdCreativeItem {
  id: string;
  campaign_id: string;
  name: string;
  format: CreativeFormat;
  headline: string;
  body_text?: string | null;
  call_to_action: string;
  destination_url: string;
  media_urls: Array<{
    type?: string;
    url: string;
    thumbnail?: string;
    title?: string;
  }>;
  status: CreativeStatus;
  rejection_reason?: string | null;
  admin_feedback?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdTargetingItem {
  id?: string;
  campaign_id: string;
  countries: string[];
  regions?: string[];
  languages: string[];
  pet_interests: string[];
  devices: string[];
  placements: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AdCampaignItem {
  id: string;
  advertiser_id: string;
  name: string;
  objective: CampaignObjective;
  budget_type: "DAILY" | "LIFETIME";
  total_budget: number;
  daily_budget: number;
  spent: number;
  currency?: string;
  start_date: string;
  end_date?: string | null;
  status: CampaignStatus;
  rejection_reason?: string | null;
  admin_feedback?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  advertiser?: AdvertiserItem;
  ad_targeting?: AdTargetingItem | null;
  ad_creatives?: AdCreativeItem[];
}

export interface AdDailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  views: number;
  conversions: number;
  spend: number;
}

export interface AdAnalyticsSummary {
  totals: {
    impressions: number;
    reach: number;
    clicks: number;
    views: number;
    conversions: number;
    spend: number;
    baseCurrency?: string;
    currencyBreakdown?: Record<string, number>;
    avgCtr: number;
    avgCpc: number;
    avgCpm: number;
  };
  dailyTrends: AdDailyMetric[];
}

// Phase 9: Admin Notifications
export type AdminNotificationCategory =
  | "HIGH_PRIORITY_REPORT"
  | "PENDING_MODERATION"
  | "PENDING_ADVERTISEMENT"
  | "SYSTEM_FAILURE"
  | "STORAGE_WARNING"
  | "API_ERROR_SPIKE"
  | "SECURITY_EVENT"
  | "COMPLIANCE_REQUEST";

export type AdminNotificationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface AdminNotificationItem {
  id: string;
  admin_id: string | null;
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  dedup_key?: string | null;
  created_at: string;
}

// ============================================================
// PHASE 10: UNIFIED ADS CONTROL & EXTERNAL ANALYTICS TYPES
// ============================================================

export interface AdSystemControls {
  id: string;
  all_ads_enabled: boolean;
  internal_ads_enabled: boolean;
  external_ads_enabled: boolean;
  admob_enabled: boolean;
  web_ads_enabled: boolean;
  web_enabled: boolean;
  android_enabled: boolean;
  ios_enabled: boolean;
  feed_enabled: boolean;
  reels_enabled: boolean;
  community_enabled: boolean;
  explore_enabled: boolean;
  emergency_stop_active: boolean;
  emergency_stop_scope: "ALL" | "INTERNAL" | "EXTERNAL" | "NONE";
  emergency_stop_reason?: string | null;
  emergency_stop_by?: string | null;
  emergency_stop_at?: string | null;
  ad_environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  updated_at: string;
}

export interface AdProviderHealthItem {
  provider: string;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "DISABLED";
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  timeout_requests: number;
  avg_latency_ms: number;
  failure_rate_pct: number;
  timeout_rate_pct: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_error_message?: string | null;
  updated_at: string;
}

export interface ExternalAdAnalyticsData {
  timeframe: string;
  totals: {
    requests: number;
    filled: number;
    fillRate: number;
    impressions: number;
    clicks: number;
    ctr: number;
    errors: number;
    timeouts: number;
    fallbacks: number;
    revenue_usd: number;
    ecpm: number;
  };
  dailyTrends: Array<{
    date: string;
    provider: string;
    platform: string;
    placement: string;
    requests: number;
    filled: number;
    impressions: number;
    clicks: number;
    errors: number;
    timeouts: number;
    revenue_usd: number;
  }>;
}

export interface CombinedAdsAnalyticsData {
  comparison: {
    internal: {
      label: string;
      impressions: number;
      clicks: number;
      ctr: number;
      conversions: number;
      advertiserSpend: number;
      revenueType: string;
    };
    external: {
      label: string;
      requests: number;
      filled: number;
      fillRate: number;
      impressions: number;
      clicks: number;
      ctr: number;
      networkRevenue: number;
      revenueType: string;
    };
    total: {
      impressions: number;
      clicks: number;
      combinedCtr: number;
    };
  };
}

