import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { getUserProfile, searchUsers } from "./user.service";
import { uploadAvatarToStorage, uploadCoverToStorage } from "../media/storage.service";

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
    try {
        const user = (req as any).user;
        const { username, full_name, fullName, bio, location, website, phone, dateOfBirth, date_of_birth, avatar_url, cover_url } = req.body;

        const updateData: any = {};
        if (full_name !== undefined || fullName !== undefined) updateData.full_name = full_name || fullName;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;
        if (phone !== undefined) updateData.phone = phone;
        if (dateOfBirth !== undefined || date_of_birth !== undefined) updateData.date_of_birth = dateOfBirth || date_of_birth;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (cover_url !== undefined) updateData.cover_url = cover_url;

        if (username !== undefined && username !== "") {
            const trimmedUsername = username.trim().toLowerCase();
            const usernameRegex = /^[a-z0-9_]{3,20}$/;
            if (!usernameRegex.test(trimmedUsername)) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores.",
                });
            }

            const { data: existingUser } = await supabase
                .from("profiles")
                .select("id")
                .eq("username", trimmedUsername)
                .neq("id", user.id)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Username is already taken by another account.",
                });
            }

            updateData.username = trimmedUsername;
        }

        const { data, error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully",
            data,
        });
    } catch (err: any) {
        console.error("Update profile error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error",
        });
    }
};

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided for avatar.",
            });
        }

        const ext = file.originalname ? file.originalname.split('.').pop() : 'jpg';
        const filename = `${user.id}_avatar_${Date.now()}.${ext}`;
        const avatar_url = await uploadAvatarToStorage(file.buffer, filename, file.mimetype || "image/jpeg");

        const { data, error } = await supabase
            .from("profiles")
            .update({ avatar_url })
            .eq("id", user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.json({
            success: true,
            message: "Avatar updated successfully",
            avatar_url,
            data,
        });
    } catch (err: any) {
        console.error("Update avatar error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error",
        });
    }
};

export const updateCover = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided for cover photo.",
            });
        }

        const ext = file.originalname ? file.originalname.split('.').pop() : 'jpg';
        const filename = `${user.id}_cover_${Date.now()}.${ext}`;
        const cover_url = await uploadCoverToStorage(file.buffer, filename, file.mimetype || "image/jpeg");

        const { data, error } = await supabase
            .from("profiles")
            .update({ cover_url })
            .eq("id", user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.json({
            success: true,
            message: "Cover image updated successfully",
            cover_url,
            data,
        });
    } catch (err: any) {
        console.error("Update cover error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error",
        });
    }
};

export const deleteAccount = async (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Account deleted",
    });
};

export const search = async (
    req: Request,
    res: Response
) => {

    const user = (req as any).user?.id;
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

        const users = await searchUsers(
            user,
            q,
            page,
            limit
        );

        return res.json({

            success: true,

            data: users

        });

    } catch (error: any) {

        return res.status(500).json({

            success: false,

            message: error.message

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
            fullName,
            full_name,
            avatar_url,
            avatarUrl,
            bio,
            location,
            website,
            phone,
            dateOfBirth,
            date_of_birth,
        } = req.body;

        const resolvedFullName =
            full_name ||
            fullName ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.fullName ||
            user?.user_metadata?.name ||
            username ||
            "Pet Parent";

        const resolvedAvatarUrl = avatar_url || avatarUrl || null;
        const resolvedDob = dateOfBirth || date_of_birth || null;

        const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from("profiles")
                .update({
                    username,
                    full_name: resolvedFullName,
                    avatar_url: resolvedAvatarUrl,
                    bio,
                    location,
                    website,
                    phone,
                    date_of_birth: resolvedDob,
                })
                .eq("id", user.id)
                .select()
                .single();

            if (updateError) {
                return res.status(400).json({
                    success: false,
                    message: updateError.message,
                });
            }

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: updated,
            });
        }

        const { data, error } = await supabase
            .from("profiles")
            .insert([
                {
                    id: user.id,
                    username,
                    full_name: resolvedFullName,
                    avatar_url: resolvedAvatarUrl,
                    bio,
                    location,
                    website,
                    phone,
                    date_of_birth: resolvedDob,
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


export const getProfile = async (
    req: Request,
    res: Response
) => {

    try {

        const currentUserId = (req as any).user!.id;

        const profileUserId = (req as any).params.id;

        const profile = await getUserProfile(
            currentUserId,
            profileUserId
        );

        return res.json({
            success: true,
            data: profile
        });

    } catch (error: any) {

        return res.status(404).json({

            success: false,

            message: error.message

        });

    }

};