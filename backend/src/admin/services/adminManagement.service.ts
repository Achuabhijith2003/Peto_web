import { Request } from "express";
import { supabase } from "../../config/supabase";
import { AdminSessionContext, CreateAdminInput, UpdateAdminInput } from "../admin.types";

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
  return rbacAction(currentAdmin.userId, "admin_create", null, input);
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
  return rbacAction(currentAdmin.userId, "admin_update", adminId, input);
}

/**
 * Revoke administrator privileges
 */
export async function deleteAdminService(
  adminId: string,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  await rbacAction(currentAdmin.userId, "admin_delete", adminId); return {success:true};
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
      admin_users(count),
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
    assigned_count: role.admin_users?.[0]?.count || 0,
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

export async function rbacAction(actor: string, action: string, id: string | null, input: unknown = {}) {
 const {data,error} = await supabase.rpc("admin_rbac_action",{p_actor:actor,p_action:action,p_id:id,p_input:input});
 if(error) throw Object.assign(new Error(error.message),{status:error.code === "42501" ? 403 : error.code === "P0002" ? 404 : error.code === "23505" ? 409 : 400});
 return data;
}
