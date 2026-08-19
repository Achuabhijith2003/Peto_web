import { z } from "zod";

export const createCommunitySchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name cannot exceed 100 characters"),
    slug: z.string().min(3).max(120).regex(/^[a-z0-9-_]+$/i, "Slug can only contain letters, numbers, hyphens, and underscores").optional(),
    description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().default(""),
    category: z.string().min(2).max(60).optional().default("General"),
    cover_image_url: z.string().url().nullable().optional(),
    icon_url: z.string().url().nullable().optional(),
    visibility: z.enum(["public", "private"]).default("public"),
    rules: z.array(z.object({
        title: z.string().min(2).max(150),
        description: z.string().max(1000).optional().default(""),
    })).optional(),
});

export const updateCommunitySchema = z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().min(2).max(60).optional(),
    cover_image_url: z.string().url().nullable().optional(),
    icon_url: z.string().url().nullable().optional(),
    visibility: z.enum(["public", "private"]).optional(),
});

export const createRuleSchema = z.object({
    title: z.string().min(2, "Rule title must be at least 2 characters").max(150),
    description: z.string().max(1000).optional().default(""),
    position: z.number().int().nonnegative().optional(),
});

export const updateRuleSchema = z.object({
    title: z.string().min(2).max(150).optional(),
    description: z.string().max(1000).optional(),
    position: z.number().int().nonnegative().optional(),
});

export const createReportSchema = z.object({
    reported_user_id: z.string().uuid().optional(),
    post_id: z.string().uuid().optional(),
    comment_id: z.string().uuid().optional(),
    reason: z.enum(["spam", "harassment", "hate", "misinformation", "inappropriate", "off-topic", "other"]),
    description: z.string().max(1000).optional().default(""),
}).refine(data => data.reported_user_id || data.post_id || data.comment_id, {
    message: "A report must be attached to a user, post, or comment.",
});

export const updateReportSchema = z.object({
    status: z.enum(["pending", "reviewed", "dismissed", "actioned"]),
});

export const createBanSchema = z.object({
    user_id: z.string().uuid("Invalid user ID to ban"),
    reason: z.string().min(3, "Please provide a reason for the ban").max(500),
    expires_at: z.string().datetime().nullable().optional(),
});

export const updateMemberRoleSchema = z.object({
    role: z.enum(["moderator", "member"]),
});
