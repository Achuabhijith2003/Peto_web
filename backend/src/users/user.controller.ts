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

export const getUserById = async (req: Request, res: Response) => {
    res.json({
        success: true,
        userId: req.params.id,
    });
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

export const searchUsers = async (req: Request, res: Response) => {
    res.json({
        success: true,
        query: req.query.q,
    });
};

export const checkUsername = async (req: Request, res: Response) => {
    res.json({
        success: true,
        username: req.query.username,
        available: true,
    });
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