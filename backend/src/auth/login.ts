import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

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
    console.log(error);

  if (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }

  res.json({
    success: true,
    user: data.user,
    session: data.session,
    token: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
  });
};