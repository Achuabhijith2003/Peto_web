import { Request, Response } from "express";

import {
    likePostService,
    unlikePostService,
    getLikesService
} from "./like.service";

export async function likePost(req: Request, res: Response) {

    try {

        const userId = (req as any).user!.id;

        const postId = (req as any).params.id;

        const data = await likePostService(userId, postId);

        return res.json({
            success: true,
            message: "Post liked",
            data
        });

    } catch (err: any) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

export async function unlikePost(req: Request, res: Response) {

    try {

        const userId = (req as any).user!.id;

        const postId = (req as any).params.id;

        await unlikePostService(userId, postId);

        return res.json({
            success: true,
            message: "Like removed"
        });

    } catch (err: any) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

export async function getLikes(req: Request, res: Response) {

    try {

        const postId = (req as any).params.id;

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        const data = await getLikesService(
            postId,
            page,
            limit
        );

        return res.json({
            success: true,
            ...data
        });

    } catch (err: any) {

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

}