import { Request } from "express";
import { supabase } from "../../config/supabase";
import { AdminSessionContext, CreateAdminInput, UpdateAdminInput } from "../admin.types";
import { createAuditLog } from "./adminAudit.service";

/**
 * Fetch paginated list of administrators
 */
export async function getAdminsService(page = 1, limit = 20, search?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("admin_users")
    .select(`
      id,
      user_id,
      role_id,
      is_active,
      last_login_at,
      created_at,
      updated_at,
      profile:profiles!admin_users_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url,
        phone,
        created_at
      ),
      role:admin_roles!admin_users_role_id_fkey(
        id,
        name,
        description,
        is_system
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
      throw new Error("Table admin_users not found. Please execute database migration 11.");
    }
    throw error;
  }

  let admins = data || [];

  // Optional client-side search filter on profile name or username if search string provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    admins = admins.filter((item: any) => {
      const username = item.profile?.username?.toLowerCase() || "";
      const fullName = item.profile?.full_name?.toLowerCase() || "";
      return username.includes(q) || fullName.includes(q);
    });
  }

  return {
    admins,
    pagination: {
      page,
      limit,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Assign an administrative role to an existing Peto user
 */
export async function createAdminService(
  input: CreateAdminInput,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  const { userId, roleId } = input;

  if (!userId || !roleId) {
    throw new Error("Both userId and roleId are required.");
  }

  // 1. Verify user profile exists
  const { data: userProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("id", userId)
    .single();

  if (profileErr || !userProfile) {
    throw new Error("Target user profile was not found.");
  }

  // 2. Check if already an admin
  const { data: existingAdmin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAdmin) {
    throw new Error("User already holds an administrative role.");
  }

  // 3. Verify role exists
  const { data: roleData, error: roleErr } = await supabase
    .from("admin_roles")
    .select("id, name")
    .eq("id", roleId)
    .single();

  if (roleErr || !roleData) {
    throw new Error("Target administrative role not found.");
  }

  // 4. Create admin user
  const { data: newAdmin, error: insertErr } = await supabase
    .from("admin_users")
    .insert({
      user_id: userId,
      role_id: roleId,
      is_active: true,
      invited_by: currentAdmin.userId,
    })
    .select(`
      id,
      user_id,
      role_id,
      is_active,
      created_at
    `)
    .single();

  if (insertErr) {
    throw insertErr;
  }

  // 5. Audit Log
  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: "ADMIN_CREATED",
      resourceType: "admin_user",
      resourceId: newAdmin.id,
      details: {
        targetUserId: userId,
        targetUsername: userProfile.username,
        roleId,
        roleName: roleData.name,
      },
    },
    req
  );

  return newAdmin;
}

/**
 * Update an administrator's role or active status
 */
export async function updateAdminService(
  adminId: string,
  input: UpdateAdminInput,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  // 1. Fetch current admin record
  const { data: targetAdmin, error: findErr } = await supabase
    .from("admin_users")
    .select(`
      id,
      user_id,
      role_id,
      is_active,
      role:admin_roles(name)
    `)
    .eq("id", adminId)
    .single();

  if (findErr || !targetAdmin) {
    throw new Error("Administrator record not found.");
  }

  // Prevent self-deactivation if caller is modifying themselves
  if (targetAdmin.id === currentAdmin.id && input.isActive === false) {
    throw new Error("Administrators cannot deactivate their own account.");
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.roleId !== undefined) {
    updates.role_id = input.roleId;
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive;
  }

  const { data: updatedAdmin, error: updateErr } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", adminId)
    .select(`
      id,
      user_id,
      role_id,
      is_active,
      updated_at
    `)
    .single();

  if (updateErr) {
    throw updateErr;
  }

  // 2. Audit Log
  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: input.roleId ? "ROLE_CHANGED" : "ADMIN_UPDATED",
      resourceType: "admin_user",
      resourceId: adminId,
      details: {
        previousState: {
          roleId: targetAdmin.role_id,
          isActive: targetAdmin.is_active,
        },
        newState: input,
      },
    },
    req
  );

  return updatedAdmin;
}

/**
 * Revoke administrator privileges
 */
export async function deleteAdminService(
  adminId: string,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  if (adminId === currentAdmin.id) {
    throw new Error("You cannot revoke your own administrator account.");
  }

  const { data: targetAdmin, error: findErr } = await supabase
    .from("admin_users")
    .select("id, user_id, role_id")
    .eq("id", adminId)
    .single();

  if (findErr || !targetAdmin) {
    throw new Error("Administrator record not found.");
  }

  const { error: deleteErr } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (deleteErr) {
    throw deleteErr;
  }

  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: "ADMIN_REMOVED",
      resourceType: "admin_user",
      resourceId: adminId,
      details: {
        revokedUserId: targetAdmin.user_id,
        previousRoleId: targetAdmin.role_id,
      },
    },
    req
  );

  return { success: true, message: "Administrator access revoked successfully." };
}

/**
 * Fetch all available administrative roles with their associated permissions
 */
export async function getAllRolesService() {
  const { data: roles, error: rolesErr } = await supabase
    .from("admin_roles")
    .select(`
      id,
      name,
      description,
      is_system,
      created_at,
      admin_role_permissions (
        admin_permissions (
          id,
          code,
          module,
          description
        )
      )
    `)
    .order("name", { ascending: true });

  if (rolesErr) {
    if (rolesErr.code === "PGRST205" || rolesErr.message.includes("Could not find the table")) {
      throw new Error("Table admin_roles not found. Please execute database migration 11.");
    }
    throw rolesErr;
  }

  return (roles || []).map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    is_system: role.is_system,
    createdAt: role.created_at,
    permissions: (role.admin_role_permissions || [])
      .map((rp: any) => rp.admin_permissions)
      .filter(Boolean),
  }));
}

/**
 * Fetch all granular system permissions catalog
 */
export async function getAllPermissionsService() {
  const { data: permissions, error } = await supabase
    .from("admin_permissions")
    .select("id, code, module, description, created_at")
    .order("module", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
      throw new Error("Table admin_permissions not found. Please execute database migration 11.");
    }
    throw error;
  }

  return permissions || [];
}
