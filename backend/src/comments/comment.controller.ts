import { Request, Response } from "express";

import {
    createCommentService,
    getCommentsService,
    updateCommentService,
    deleteCommentService
} from "./comment.service";

export async function createComment(
    req: Request,
    res: Response
) {
    try {

        const userId = (req as any).user!.id;

        const postId = (req as any).params.id;

        const {
            comment,
            parent_comment_id
        } = req.body;

        const data = await createCommentService(
            userId,
            postId,
            comment,
            parent_comment_id
        );

        res.json({
            success: true,
            data
        });

    } catch (err: any) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }
}

export async function getComments(
    req: Request,
    res: Response
) {

    try {

        const postId = (req as any).params.id;

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        const data = await getCommentsService(
            postId,
            page,
            limit
        );

        res.json({
            success: true,
            ...data
        });

    } catch (err: any) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

export async function updateComment(
    req: Request,
    res: Response
) {

    try {

        const userId = (req as any).user!.id;

        const commentId = (req as any).params.id;

        const { comment } = req.body;

        const data = await updateCommentService(
            userId,
            commentId,
            comment
        );

        res.json({
            success: true,
            data
        });

    } catch (err: any) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

}

export async function deleteComment(
    req: Request,
    res: Response
) {

    try {

        const userId = (req as any).user!.id;

        const commentId = (req as any).params.id;

        await deleteCommentService(
            userId,
            commentId
        );

        res.json({
            success: true
        });

    } catch (err: any) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

}