import { Request, Response } from "express";
import fs from "fs/promises";
import sharp from "sharp";
import { supabase } from "../config/supabase";
import { getUserProfile, searchUsers } from "./user.service";
import { uploadAvatarToStorage, uploadCoverToStorage } from "../media/storage.service";
import { validateUploadedFile, cleanupFile } from "../media/fileValidator";
import {
    getPublicProfileFromCache,
    setPublicProfileToCache,
    invalidatePublicProfileCache
} from "../cache/cache.service";

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

        let profile = data;
        if (!profile || !profile.username || profile.username.trim() === "") {
            const fallbackUsername =
                user?.user_metadata?.username ||
                user?.user_metadata?.user_name ||
                (user?.email ? user.email.split("@")[0].toLowerCase() : `user_${user.id.slice(0, 6)}`);
            const fallbackFullName =
                user?.user_metadata?.full_name ||
                user?.user_metadata?.fullName ||
                user?.user_metadata?.name ||
                fallbackUsername;

            try {
                if (!profile) {
                    const { data: newProfile } = await supabase
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
                    const { data: updatedProfile } = await supabase
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
            } catch (healErr) {
                console.warn("[getCurrentUser] Self-healing profile warning:", healErr);
            }
        }

        const resolvedUsername =
            profile?.username ||
            user?.user_metadata?.username ||
            user?.user_metadata?.user_name ||
            (user?.email ? user.email.split("@")[0].toLowerCase() : "");

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
            avatar_url: profile?.avatar_url || user?.avatar_url || user?.user_metadata?.avatar_url || null,
            avatarUrl: profile?.avatar_url || user?.avatar_url || user?.user_metadata?.avatar_url || null,
            cover_url: profile?.cover_url || user?.cover_url || user?.user_metadata?.cover_url || null,
            coverUrl: profile?.cover_url || user?.cover_url || user?.user_metadata?.cover_url || null,
            date_of_birth: profile?.date_of_birth || user?.user_metadata?.date_of_birth || null,
            dateOfBirth: profile?.date_of_birth || user?.user_metadata?.date_of_birth || null,
        };

        return res.status(200).json({
            success: true,
            user: mergedUser,
            profile: profile || null,
            data: mergedUser,
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

        const id = String(req.params.id || "").trim();

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let data: any = null;
        try {
            data = await getPublicProfileFromCache(id);
        } catch {
            data = null;
        }

        if (!data) {
            let query = supabase
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
          `);

            if (isUuid) {
                query = query.eq("id", id);
            } else {
                query = query.ilike("username", id.trim());
            }

            const { data: dbData, error } = await query.maybeSingle();

            if (error || !dbData) {
                return res.status(404).json({
                    success: false,
                    message: "User not found.",
                });
            }
            data = dbData;
            setPublicProfileToCache(dbData).catch(() => {});
        }

        const currentUserId = (req as any).user?.id;
        let isFollowing = false;
        if (currentUserId && currentUserId !== data.id) {
            const { data: followRel } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", currentUserId)
                .eq("following_id", data.id)
                .maybeSingle();
            isFollowing = !!followRel;
        }

        return res.status(200).json({
            success: true,
            data: {
                ...data,
                is_following: isFollowing,
                isFollowing: isFollowing,
            },
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
        const { username, full_name, fullName, bio, location, website, phone, dateOfBirth, date_of_birth, avatar_url, avatarUrl, avatar, cover_url, coverUrl, cover } = req.body;

        const updateData: any = {};
        if (full_name !== undefined || fullName !== undefined) updateData.full_name = full_name || fullName;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;
        if (dateOfBirth !== undefined || date_of_birth !== undefined) {
            const rawDob = dateOfBirth || date_of_birth;
            if (rawDob) {
                const birthDate = new Date(rawDob);
                if (isNaN(birthDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid date of birth provided.",
                    });
                }
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age < 13) {
                    return res.status(400).json({
                        success: false,
                        message: "You must be at least 13 years old to use Peto.",
                    });
                }
            }
            updateData.date_of_birth = rawDob;
        }

        const resolvedAvatar = avatar_url !== undefined ? avatar_url : (avatarUrl !== undefined ? avatarUrl : avatar);
        if (resolvedAvatar !== undefined) updateData.avatar_url = resolvedAvatar;

        const resolvedCover = cover_url !== undefined ? cover_url : (coverUrl !== undefined ? coverUrl : cover);
        if (resolvedCover !== undefined) updateData.cover_url = resolvedCover;

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

        // Fetch current profile to check verification status and existing full_name
        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("id, username, full_name, verified, is_verified, verification_badge_type")
            .eq("id", user.id)
            .single();

        const isChangingCriticalName =
            updateData.full_name !== undefined &&
            currentProfile &&
            currentProfile.full_name &&
            currentProfile.full_name.trim() !== updateData.full_name.trim();

        const wasVerified =
            currentProfile?.verified === true ||
            currentProfile?.is_verified === true ||
            currentProfile?.verification_badge_type === "PERSON";

        const willRequireReverification = isChangingCriticalName && wasVerified;

        // PETO-SEC-16: Ensure client cannot self-grant or alter verification flags via mass-assignment
        delete (updateData as any).verified;
        delete (updateData as any).is_verified;
        delete (updateData as any).verification_badge_type;

        // PETO-SEC-16: If critical real name changed for a verified identity,
        // atomically strip verification flags from profiles table
        if (willRequireReverification) {
            updateData.verified = false;
            updateData.is_verified = false;
            updateData.verification_badge_type = "NONE";
            updateData.status_reason = "Critical legal/display name altered in profile settings; reverification required";
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

        // PETO-SEC-16: Authoritatively update verification_applications record
        if (willRequireReverification) {
            try {
                await supabase
                    .from("verification_applications")
                    .update({
                        status: "REVERIFICATION_REQUIRED",
                        reverification_reason: "Critical legal/display name altered in profile settings",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.id)
                    .eq("verification_type", "INDIVIDUAL_IDENTITY")
                    .eq("status", "APPROVED");
            } catch (verifErr: any) {
                console.warn("[updateProfile] Notice updating verification_applications:", verifErr?.message || verifErr);
            }
        }

        invalidatePublicProfileCache(user.id, currentProfile?.username).catch(() => {});

        return res.json({
            success: true,
            message: willRequireReverification
                ? "Profile updated. Your verified identity name was modified, so your verification badge has been temporarily removed and reverification is required."
                : "Profile updated successfully",
            data,
            reverification_required: willRequireReverification,
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
    let file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);
    if (!file && req.files && typeof req.files === "object") {
        const filesObj = req.files as Record<string, Express.Multer.File[]>;
        const firstKey = Object.keys(filesObj)[0];
        if (firstKey && filesObj[firstKey]?.length > 0) {
            file = filesObj[firstKey][0];
        }
    }

    try {
        const user = (req as any).user;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided for avatar.",
            });
        }

        const validation = await validateUploadedFile(file, "image");
        if (!validation.valid) {
            await cleanupFile(file);
            return res.status(400).json({
                success: false,
                message: validation.error || "Avatar image validation failed.",
            });
        }

        let fileBuffer = file.buffer;
        if (!fileBuffer && file.path) {
            fileBuffer = await fs.readFile(file.path);
        }

        if (!fileBuffer) {
            return res.status(400).json({
                success: false,
                message: "Could not read avatar image file.",
            });
        }

        // Compress and optimize avatar with sharp
        let processedBuffer: Buffer = fileBuffer;
        try {
            processedBuffer = await sharp(fileBuffer)
                .rotate()
                .resize({ width: 600, height: 600, fit: "cover" })
                .webp({ quality: 85 })
                .toBuffer();
        } catch (sharpErr) {
            console.warn("Sharp avatar processing warning, using original buffer:", sharpErr);
        }

        const filename = `${user.id}_avatar_${Date.now()}.webp`;
        const avatar_url = await uploadAvatarToStorage(processedBuffer, filename, "image/webp");

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

        invalidatePublicProfileCache(user.id).catch(() => {});

        return res.json({
            success: true,
            message: "Avatar updated successfully",
            avatar_url,
            avatarUrl: avatar_url,
            data,
        });
    } catch (err: any) {
        console.error("Update avatar error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error",
        });
    } finally {
        if (file?.path) {
            try {
                await fs.unlink(file.path);
            } catch (_) {}
        }
    }
};

export const updateCover = async (req: Request, res: Response) => {
    let file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);
    if (!file && req.files && typeof req.files === "object") {
        const filesObj = req.files as Record<string, Express.Multer.File[]>;
        const firstKey = Object.keys(filesObj)[0];
        if (firstKey && filesObj[firstKey]?.length > 0) {
            file = filesObj[firstKey][0];
        }
    }

    try {
        const user = (req as any).user;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided for cover photo.",
            });
        }

        const validation = await validateUploadedFile(file, "image");
        if (!validation.valid) {
            await cleanupFile(file);
            return res.status(400).json({
                success: false,
                message: validation.error || "Cover image validation failed.",
            });
        }

        let fileBuffer = file.buffer;
        if (!fileBuffer && file.path) {
            fileBuffer = await fs.readFile(file.path);
        }

        if (!fileBuffer) {
            return res.status(400).json({
                success: false,
                message: "Could not read cover image file.",
            });
        }

        let processedBuffer: Buffer = fileBuffer;
        try {
            processedBuffer = await sharp(fileBuffer)
                .rotate()
                .resize({ width: 1400, height: 600, fit: "cover" })
                .webp({ quality: 85 })
                .toBuffer();
        } catch (sharpErr) {
            console.warn("Sharp cover processing warning, using original buffer:", sharpErr);
        }

        const filename = `${user.id}_cover_${Date.now()}.webp`;
        const cover_url = await uploadCoverToStorage(processedBuffer, filename, "image/webp");

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

        invalidatePublicProfileCache(user.id).catch(() => {});

        return res.json({
            success: true,
            message: "Cover image updated successfully",
            cover_url,
            coverUrl: cover_url,
            data,
        });
    } catch (err: any) {
        console.error("Update cover error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Internal server error",
        });
    } finally {
        if (file?.path) {
            try {
                await fs.unlink(file.path);
            } catch (_) {}
        }
    }
};

export const deleteAccount = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user?.id) {
        invalidatePublicProfileCache(user.id).catch(() => {});
    }
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
            console.error("Check Username Supabase Error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
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

        const resolvedUsername = (
            username ||
            user?.user_metadata?.username ||
            user?.user_metadata?.user_name ||
            (user?.email ? user.email.split("@")[0] : `user_${user.id.slice(0, 6)}`)
        ).trim().toLowerCase();

        if (resolvedUsername) {
            const usernameRegex = /^[a-z0-9_]{3,20}$/;
            if (!usernameRegex.test(resolvedUsername)) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores.",
                });
            }
        }

        const resolvedDob = dateOfBirth || date_of_birth || null;
        if (resolvedDob) {
            const birthDate = new Date(resolvedDob);
            if (isNaN(birthDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date of birth provided.",
                });
            }
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 13) {
                return res.status(400).json({
                    success: false,
                    message: "You must be at least 13 years old to use Peto.",
                });
            }
        }

        const resolvedFullName =
            full_name ||
            fullName ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.fullName ||
            user?.user_metadata?.name ||
            resolvedUsername ||
            "Pet Parent";

        const resolvedAvatarUrl = avatar_url || avatarUrl || null;

        const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from("profiles")
                .update({
                    username: resolvedUsername,
                    full_name: resolvedFullName,
                    avatar_url: resolvedAvatarUrl,
                    bio,
                    location,
                    website,
                    phone,
                    date_of_birth: resolvedDob,
                    updated_at: new Date().toISOString(),
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
                    username: resolvedUsername,
                    full_name: resolvedFullName,
                    avatar_url: resolvedAvatarUrl,
                    bio,
                    location,
                    website,
                    phone,
                    date_of_birth: resolvedDob,
                    status: "ACTIVE",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
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