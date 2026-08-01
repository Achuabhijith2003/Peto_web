import { supabase } from "../config/supabase";
import { getUserProfile, searchUsers } from "./user.service";
export const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        if (error && error.code !== "PGRST116") { // PGRST116 is no rows returned
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(200).json({
            success: true,
            user,
            profile: data || null,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }
        const { data, error } = await supabase
            .from("profiles")
            .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        cover_url,
        location,
        website,
        verified,
        followers_count,
        following_count,
        posts_count,
        created_at
      `)
            .eq("id", id)
            .single();
        if (error) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (err) {
        console.error("Get User By ID Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
export const updateProfile = async (req, res) => {
    res.json({
        success: true,
        body: req.body,
    });
};
export const updateAvatar = async (_req, res) => {
    res.json({
        success: true,
        message: "Avatar updated",
    });
};
export const updateCover = async (_req, res) => {
    res.json({
        success: true,
        message: "Cover image updated",
    });
};
export const deleteAccount = async (_req, res) => {
    res.json({
        success: true,
        message: "Account deleted",
    });
};
export const search = async (req, res) => {
    console.log("Search function in calling....");
    const user = req.user.id;
    console.log("UserId: ", user);
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const q = String(req.query.q || "");
        if (!q.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required."
            });
        }
        const users = await searchUsers(user, q, page, limit);
        return res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const checkUsername = async (req, res) => {
    try {
        const username = req.query.username?.trim().toLowerCase();
        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Username is required.",
            });
        }
        // Username validation
        const usernameRegex = /^[a-z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores.",
            });
        }
        const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();
        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(200).json({
            success: true,
            username,
            available: !data,
            message: data
                ? "Username is already taken."
                : "Username is available.",
        });
    }
    catch (err) {
        console.error("Check Username Error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
export const createProfile = async (req, res) => {
    try {
        const user = req.user;
        const { username, bio, location, website, phone, dateOfBirth, } = req.body;
        const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Profile already exists",
            });
        }
        const { data, error } = await supabase
            .from("profiles")
            .insert([
            {
                id: user.id,
                username,
                full_name: user.user_metadata?.full_name ??
                    user.user_metadata?.fullName,
                bio,
                location,
                website,
                phone,
                date_of_birth: dateOfBirth,
            },
        ])
            .select()
            .single();
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(201).json({
            success: true,
            message: "Profile created successfully",
            data,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
export const getProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const profileUserId = req.params.id;
        const profile = await getUserProfile(currentUserId, profileUserId);
        return res.json({
            success: true,
            data: profile
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};
