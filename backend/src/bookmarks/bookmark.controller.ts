import { Request, Response } from "express";
import { resolveActingIdentity } from "../businesses/business.rbac";

import {
    bookmarkPostService,
    removeBookmarkService,
    getBookmarksService
} from "./bookmark.service";

export async function bookmarkPost(
    req: Request,
    res: Response
) {
    try {

        const user = (req as any).user!;
        const postId = (req as any).params.id;

        const actingIdentity = await resolveActingIdentity(
            user,
            req.body,
            req.headers,
            "business.bookmark"
        );

        const data = await bookmarkPostService(
            user.id,
            postId,
            actingIdentity.type === "BUSINESS" ? actingIdentity.id : undefined,
            actingIdentity.type
        );

        res.json({
            success: true,
            message: "Post bookmarked",
            data
        });

    } catch (err: any) {
        const status = err?.status || (err?.message?.includes("Permission denied") ? 403 : 500);
        res.status(status).json({
            success: false,
            message: err.message
        });

    }
}

export async function removeBookmark(
    req: Request,
    res: Response
) {

    try {

        const user = (req as any).user!;
        const postId = (req as any).params.id;

        const actingIdentity = await resolveActingIdentity(
            user,
            req.body,
            req.headers,
            "business.bookmark"
        );

        await removeBookmarkService(
            user.id,
            postId,
            actingIdentity.type === "BUSINESS" ? actingIdentity.id : undefined
        );

        res.json({
            success: true,
            message: "Bookmark removed"
        });

    } catch (err: any) {
        const status = err?.status || (err?.message?.includes("Permission denied") ? 403 : 500);
        res.status(status).json({
            success: false,
            message: err.message
        });

    }

}

export async function getBookmarks(
    req: Request,
    res: Response
) {

    try {

        const user = (req as any).user!;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        const actingIdentity = await resolveActingIdentity(
            user,
            req.query,
            req.headers,
            "business.bookmark"
        );

        const data = await getBookmarksService(
            user.id,
            page,
            limit,
            actingIdentity.type === "BUSINESS" ? actingIdentity.id : undefined
        );

        res.json({
            success: true,
            ...data
        });

    } catch (err: any) {
        const status = err?.status || (err?.message?.includes("Permission denied") ? 403 : 500);
        res.status(status).json({
            success: false,
            message: err.message
        });

    }

}