import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const signup = async (req: Request, res: Response) => {
  const { email, password, fullName, full_name, username } = req.body;
  const nameToSave = fullName || full_name || username || "";
  const usernameToSave = username || (nameToSave ? nameToSave.toLowerCase().replace(/\s+/g, "") : "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nameToSave,
        fullName: nameToSave,
        username: usernameToSave,
      },
    },
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  res.status(201).json({
    success: true,
    user: data.user,
    session: data.session,
    token: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
  });
};