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

    media: z.array(
        z.string().uuid()
    ).max(10).optional()

});