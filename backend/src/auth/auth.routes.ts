import { Router } from "express";
import { signup } from "./signup";
import { login } from "./login";
import { authenticate } from "./auth.middleware";
import { supabase } from "../config/supabase";

console.log("✅ Auth routes loaded");

const router = Router();

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Auth router working"
    });
});

router.post("/signup", signup);
router.post("/login", login);

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: error?.message || "Invalid or expired refresh token",
      });
    }

    return res.json({
      success: true,
      session: data.session,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Request password reset link (Supabase sends email with reset link)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, redirectTo } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const targetRedirectUrl = redirectTo || `${clientUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: targetRedirectUrl,
    });

    if (error) {
      console.error("Supabase resetPasswordForEmail error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to send password reset email",
      });
    }

    return res.json({
      success: true,
      message: "Password reset link has been sent to your email address.",
    });
  } catch (err: any) {
    console.error("Forgot password route error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
});

// Reset password with recovery token
router.post("/reset-password", async (req, res) => {
  try {
    const { password, token: bodyToken } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : bodyToken;

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Recovery token is missing or expired",
      });
    }

    // Verify token and retrieve user
    const { data: userData, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !userData?.user) {
      return res.status(401).json({
        success: false,
        message: getUserError?.message || "Invalid or expired recovery session",
      });
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password }
    );

    if (updateError) {
      console.error("Supabase updateUserById error:", updateError);
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to update password",
      });
    }

    return res.json({
      success: true,
      message: "Password has been successfully reset. You can now log in with your new password.",
    });
  } catch (err: any) {
    console.error("Reset password route error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
});

// Change Password for authenticated user
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    if (!user?.email) {
      return res.status(400).json({
        success: false,
        message: "User account email could not be resolved.",
      });
    }

    // Verify current password if provided
    if (currentPassword) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Supabase change-password error:", updateError);
      return res.status(400).json({
        success: false,
        message: updateError.message || "Failed to update password.",
      });
    }

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err: any) {
    console.error("Change password route error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
});

// ----------------------------------------------------
// GOOGLE OAUTH & PROFILE AUTO-SIGNUP ENDPOINTS
// ----------------------------------------------------

interface PendingGoogleSession {
  token: string;
  refreshToken: string;
  user: any;
  profile: any;
  expiresAt: number;
}

const googleSyncCodes = new Map<string, PendingGoogleSession>();

// Cleanup expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, item] of googleSyncCodes.entries()) {
    if (item.expiresAt < now) {
      googleSyncCodes.delete(code);
    }
  }
}, 60 * 1000);

/**
 * GET /api/auth/google/url
 * Returns Supabase Google OAuth authorization URL with target redirect URL
 */
router.get("/google/url", (req, res) => {
  try {
    const redirect = (req.query.redirect_to as string) || (req.query.redirectTo as string);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const targetRedirect = redirect || `${clientUrl}/auth/callback`;
    const supabaseUrl = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";

    const url = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(targetRedirect)}`;

    return res.json({
      success: true,
      url,
      redirectTo: targetRedirect,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate Google auth URL",
    });
  }
});

/**
 * POST /api/auth/google
 * Validates Google session token, ensures profile exists in profiles table (auto-signup),
 * and returns tokens, user, and profile.
 */
router.post("/google", async (req, res) => {
  try {
    let { token, refreshToken, code } = req.body;

    // If OAuth code is provided, exchange for session
    if (code && !token) {
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !sessionData.session) {
        return res.status(400).json({
          success: false,
          message: exchangeError?.message || "Failed to exchange authorization code.",
        });
      }
      token = sessionData.session.access_token;
      refreshToken = sessionData.session.refresh_token;
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Session access token is required for Google authentication.",
      });
    }

    // Verify token with Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({
        success: false,
        message: userError?.message || "Invalid or expired Google authentication session.",
      });
    }

    const user = userData.user;

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    let profile = existingProfile;

    if (!existingProfile) {
      // New user signup via Google!
      const metadata = user.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || user.email?.split("@")[0] || "Peto User";
      const rawUsername = (metadata.user_name || metadata.preferred_username || fullName)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 15) || "petouser";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const uniqueUsername = `${rawUsername}_${randomSuffix}`;
      const avatarUrl = metadata.avatar_url || metadata.picture || null;

      const { data: createdProfile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: fullName,
          username: uniqueUsername,
          avatar_url: avatarUrl,
        })
        .select("*")
        .single();

      if (!profileErr && createdProfile) {
        profile = createdProfile;
      } else {
        profile = {
          id: user.id,
          full_name: fullName,
          username: uniqueUsername,
          avatar_url: avatarUrl,
        };
      }
    }

    // Generate a 6-digit sync code for mobile handoff fallback
    const syncCode = Math.floor(100000 + Math.random() * 900000).toString();
    googleSyncCodes.set(syncCode, {
      token,
      refreshToken: refreshToken || "",
      user,
      profile,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return res.json({
      success: true,
      user,
      profile,
      token,
      refreshToken: refreshToken || null,
      syncCode,
      message: existingProfile ? "Signed in with Google successfully." : "Welcome to Peto! Account created via Google.",
    });
  } catch (err: any) {
    console.error("Google auth route error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error during Google authentication.",
    });
  }
});

/**
 * POST /api/auth/google/exchange-code
 * Exchanges temporary 6-digit sync code for session tokens and user profile
 */
router.post("/google/exchange-code", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "A 6-digit sync code is required.",
      });
    }

    const cleanCode = code.toString().trim();
    const session = googleSyncCodes.get(cleanCode);

    if (!session || session.expiresAt < Date.now()) {
      googleSyncCodes.delete(cleanCode);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired sync code. Please sign in again.",
      });
    }

    // Consume single-use code
    googleSyncCodes.delete(cleanCode);

    return res.json({
      success: true,
      token: session.token,
      refreshToken: session.refreshToken,
      user: session.user,
      profile: session.profile,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to exchange sync code.",
    });
  }
});

export default router;