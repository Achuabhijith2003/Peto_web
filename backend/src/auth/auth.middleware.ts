import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  (req as any).user = data.user;

  next();
}

export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    (req as any).user = null;
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      (req as any).user = data.user;
    } else {
      (req as any).user = null;
    }
  } catch {
    (req as any).user = null;
  }

  next();
}