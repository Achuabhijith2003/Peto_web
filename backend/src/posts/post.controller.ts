import { Request, Response } from "express";

import { createPostSchema } from "./post.validation";

import { createPostService } from "./post.service";

export const createPost = async (

    req: Request,

    res: Response

) => {

    try {

        const user = (req as any).user;

        const parsed = createPostSchema.safeParse(req.body);

        if (!parsed.success) {

            return res.status(400).json({

                success: false,

                errors: parsed.error.flatten()

            });

        }

        const post = await createPostService({

            userId: user.id,

            ...parsed.data

        });

        return res.status(201).json({

            success: true,

            data: post

        });

    } catch (err: any) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

};