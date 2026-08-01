import { z } from "zod";
export const createPostSchema = z.object({
    text: z.string()
        .max(5000)
        .optional(),
    visibility: z.enum([
        "public",
        "followers",
        "private"
    ]).default("public"),
    media: z.array(z.string().uuid()).max(10).optional()
});
const allowedVisibility = [
    "public",
    "followers",
    "private"
];
export function validateUpdatePost(req, res, next) {
    const { text, visibility } = req.body;
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
    next();
}
