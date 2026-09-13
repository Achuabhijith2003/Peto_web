export interface AdminSessionRole {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

export interface AdminSessionContext {
  id: string; // admin_users.id
  userId: string; // profiles.id / auth.users.id
  email?: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  role: AdminSessionRole;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuditLogInput {
  adminId?: string | null;
  adminUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateAdminInput {
  userId: string;
  roleId: string;
}

export interface UpdateAdminInput {
  roleId?: string;
  isActive?: boolean;
}
