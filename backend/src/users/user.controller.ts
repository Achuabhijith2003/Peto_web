import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getCurrentUser = async (
    req: Request,
    res: Response
) => {
    try {
        const user = (req as any).user;

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            data,
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


export const getUserById = async (
    req: Request,
    res: Response
) => {
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

    } catch (err) {
        console.error("Get User By ID Error:", err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    res.json({
        success: true,
        body: req.body,
    });
};

export const updateAvatar = async (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Avatar updated",
    });
};

export const updateCover = async (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Cover image updated",
    });
};

export const deleteAccount = async (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Account deleted",
    });
};

export const searchUsers = async (
    req: Request,
    res: Response
) => {
    try {
        const q = (req.query.q as string)?.trim();

        const page = Number(req.query.page ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 20), 50);

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from("profiles")
            .select(
                `
        id,
        username,
        full_name,
        avatar_url,
        bio,
        verified,
        followers_count,
        following_count,
        posts_count
      `,
                { count: "exact" }
            )
            .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
            .range(from, to);

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total: count ?? 0,
                totalPages: Math.ceil((count ?? 0) / limit),
            },
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const checkUsername = async (
    req: Request,
    res: Response
) => {
    try {
        const username = (req.query.username as string)?.trim().toLowerCase();

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
                message:
                    "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores.",
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
    } catch (err) {
        console.error("Check Username Error:", err);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const createProfile = async (
    req: Request,
    res: Response
) => {
    try {
        const user = (req as any).user;

        const {
            username,
            bio,
            location,
            website,
            phone,
            dateOfBirth,
        } = req.body;


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
                    full_name:
                        user.user_metadata?.full_name ??
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
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};