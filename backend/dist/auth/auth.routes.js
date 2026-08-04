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
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});
export default router;
