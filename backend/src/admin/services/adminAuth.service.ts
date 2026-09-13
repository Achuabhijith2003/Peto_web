import { supabase } from "../../config/supabase";
import { AdminSessionContext } from "../admin.types";

/**
 * Resolves full admin context for an authenticated user ID.
 * Returns null if the user is not an administrator.
 */
export async function resolveAdminContext(userId: string): Promise<AdminSessionContext | null> {
  // 1. Query admin_users
  const { data: adminRecord, error: adminError } = await supabase
    .from("admin_users")
    .select(`
      id,
      user_id,
      role_id,
      is_active,
      last_login_at,
      created_at
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError) {
    if (adminError.code === "PGRST205" || adminError.message.includes("Could not find the table")) {
      console.warn("[AdminAuth] Table admin_users does not exist. Run migration 11.");
      return null;
    }
    console.error("[AdminAuth] Error fetching admin_users:", adminError.message);
    return null;
  }

  if (!adminRecord) {
    return null;
  }

  // 2. Fetch associated role
  const { data: roleRecord, error: roleError } = await supabase
    .from("admin_roles")
    .select("id, name, description, is_system")
    .eq("id", adminRecord.role_id)
    .single();

  if (roleError || !roleRecord) {
    console.error("[AdminAuth] Role not found for admin:", adminRecord.role_id);
    return null;
  }

  // 3. Fetch user profile details
  const { data: profileRecord } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", userId)
    .single();

  // 4. Load assigned permissions
  let permissions: string[] = [];

  if (roleRecord.name === "Super Admin") {
    // Super Admin inherits all registered system permissions
    const { data: allPerms } = await supabase
      .from("admin_permissions")
      .select("code");

    if (allPerms) {
      permissions = allPerms.map((p) => p.code);
    }
  } else {
    const { data: rolePerms, error: permsError } = await supabase
      .from("admin_role_permissions")
      .select(`
        admin_permissions (
          code
        )
      `)
      .eq("role_id", roleRecord.id);

    if (!permsError && rolePerms) {
      permissions = rolePerms
        .map((item: any) => item.admin_permissions?.code)
        .filter(Boolean);
    }
  }

  // 5. Update last_login_at asynchronously
  supabase
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", adminRecord.id)
    .then(({ error }) => {
      if (error) console.error("[AdminAuth] Failed to update last_login_at:", error.message);
    });

  return {
    id: adminRecord.id,
    userId: adminRecord.user_id,
    fullName: profileRecord?.full_name || "Admin User",
    username: profileRecord?.username || "admin",
    avatarUrl: profileRecord?.avatar_url || null,
    role: {
      id: roleRecord.id,
      name: roleRecord.name,
      description: roleRecord.description,
      is_system: roleRecord.is_system,
    },
    permissions,
    isActive: adminRecord.is_active,
    lastLoginAt: adminRecord.last_login_at,
  };
}
