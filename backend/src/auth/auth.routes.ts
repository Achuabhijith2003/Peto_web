import { Router } from "express";
import { signup } from "./signup";
import { login } from "./login";
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

export default router;