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
