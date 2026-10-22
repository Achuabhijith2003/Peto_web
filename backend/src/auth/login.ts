import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase as adminSupabase } from "../config/supabase";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[Login] Auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }

  // Self-heal and fetch profile data from public.profiles
  let profile: any = null;
  const user = data.user;

  if (user?.id) {
    try {
      const { data: dbProfile } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      profile = dbProfile;

      const fallbackUsername =
        user.user_metadata?.username ||
        user.user_metadata?.user_name ||
        (email ? email.split("@")[0].toLowerCase() : `user_${user.id.slice(0, 6)}`);

      const fallbackFullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.fullName ||
        user.user_metadata?.name ||
        fallbackUsername;

      if (!profile) {
        const { data: newProfile } = await adminSupabase
          .from("profiles")
          .insert({
            id: user.id,
            username: fallbackUsername,
            full_name: fallbackFullName,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();
        if (newProfile) profile = newProfile;
      } else if (!profile.username || profile.username.trim() === "") {
        const { data: updatedProfile } = await adminSupabase
          .from("profiles")
          .update({
            username: fallbackUsername,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select()
          .maybeSingle();
        if (updatedProfile) profile = updatedProfile;
      }
    } catch (profileFetchErr) {
      console.warn("[Login] Could not self-heal/fetch profile:", profileFetchErr);
    }
  }

  const resolvedUsername =
    profile?.username ||
    user?.user_metadata?.username ||
    user?.user_metadata?.user_name ||
    (email ? email.split("@")[0].toLowerCase() : "");

  const resolvedFullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    resolvedUsername;

  const mergedUser = {
    ...user,
    ...(profile || {}),
    id: user.id,
    email: user.email,
    username: resolvedUsername,
    full_name: resolvedFullName,
    fullName: resolvedFullName,
    profile: profile || undefined,
  };

  res.json({
    success: true,
    user: mergedUser,
    session: data.session,
    token: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
  });
};