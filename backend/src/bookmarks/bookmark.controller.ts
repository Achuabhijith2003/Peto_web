import { Request, Response } from "express";

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

        const userId = (req as any).user!.id;

        const postId = (req as any).params.id;

        const data = await bookmarkPostService(
            userId,
            postId
        );

        res.json({
            success: true,
            message: "Post bookmarked",
            data
        });

    } catch (err: any) {

        res.status(500).json({
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

        const userId = (req as any).user!.id;

        const postId = (req as any).params.id;

        await removeBookmarkService(
            userId,
            postId
        );

        res.json({
            success: true,
            message: "Bookmark removed"
        });

    } catch (err: any) {

        res.status(500).json({
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

        const userId = (req as any).user!.id;

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        console.log("Userid: ",userId);
        

        const data = await getBookmarksService(
            userId,
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