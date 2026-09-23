import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const createPostSchema = z.object({
    text: z.string().max(5000).optional(),
    content: z.string().max(5000).optional(),
    visibility: z.enum([
        "public",
        "followers",
        "private"
    ]).default("public"),
    media: z.any().optional(),
    community_id: z.string().uuid("Invalid community ID").optional(),
    communityId: z.string().uuid("Invalid community ID").optional(),
    pet_id: z.string().uuid("Invalid pet ID").optional(),
    petId: z.string().uuid("Invalid pet ID").optional(),
    mentioned_user_ids: z.array(z.string().uuid("Invalid user ID")).max(10, "Maximum 10 mentions allowed").optional(),
    tagged_pet_ids: z.array(z.string().uuid("Invalid pet ID")).max(5, "Maximum 5 pet tags allowed").optional(),
});

const allowedVisibility = [
    "public",
    "followers",
    "private"
];

export function validateUpdatePost(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const { text, visibility, mentioned_user_ids, tagged_pet_ids } = req.body;

    if (text !== undefined) {
        if (typeof text !== "string") {
            return res.status(400).json({
                success: false,
                message: "Text must be a string."
            });
        }

        if (text.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Text exceeds maximum length."
            });
        }
    }

    if (visibility !== undefined) {
        if (!allowedVisibility.includes(visibility)) {
            return res.status(400).json({
                success: false,
                message: "Invalid visibility."
            });
        }
    }

    if (mentioned_user_ids !== undefined) {
        if (!Array.isArray(mentioned_user_ids)) {
            return res.status(400).json({
                success: false,
                message: "mentioned_user_ids must be an array."
            });
        }
        if (mentioned_user_ids.length > 10) {
            return res.status(400).json({
                success: false,
                message: "Maximum 10 mentions allowed."
            });
        }
    }

    if (tagged_pet_ids !== undefined) {
        if (!Array.isArray(tagged_pet_ids)) {
            return res.status(400).json({
                success: false,
                message: "tagged_pet_ids must be an array."
            });
        }
        if (tagged_pet_ids.length > 5) {
            return res.status(400).json({
                success: false,
                message: "Maximum 5 pet tags allowed."
            });
        }
    }

    next();
}