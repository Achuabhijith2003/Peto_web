import { Request, Response } from "express";
import { resolveActingIdentity } from "../businesses/business.rbac";

import {
    likePostService,
    unlikePostService,
    getLikesService
} from "./like.service";

export async function likePost(req: Request, res: Response) {

    try {

        const user = (req as any).user!;
        const postId = (req as any).params.id;

        const actingIdentity = await resolveActingIdentity(
            user,
            req.body,
            req.headers,
            "business.like"
        );

        const data = await likePostService(
            user.id,
            postId,
            actingIdentity.type === "BUSINESS" ? actingIdentity.id : undefined,
            actingIdentity.type
        );

        return res.json({
            success: true,
            message: "Post liked",
            data
        });

    } catch (err: any) {
        const status = err?.status || (err?.message?.includes("Permission denied") ? 403 : 500);
        return res.status(status).json({
            success: false,
            message: err.message
        });

    }

}

export async function unlikePost(req: Request, res: Response) {

    try {

        const user = (req as any).user!;
        const postId = (req as any).params.id;

        const actingIdentity = await resolveActingIdentity(
            user,
            req.body,
            req.headers,
            "business.like"
        );

        await unlikePostService(
            user.id,
            postId,
            actingIdentity.type === "BUSINESS" ? actingIdentity.id : undefined
        );

        return res.json({
            success: true,
            message: "Like removed"
        });

    } catch (err: any) {
        const status = err?.status || (err?.message?.includes("Permission denied") ? 403 : 500);
        return res.status(status).json({
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