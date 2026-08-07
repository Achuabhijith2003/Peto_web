import { Request, Response } from "express";
import { processMedia } from "./media.service";
import { processImage } from "./image.service";

const getFilesFromReq = (req: Request): Express.Multer.File[] => {
    if (Array.isArray(req.files) && req.files.length > 0) {
        return req.files as Express.Multer.File[];
    }
    if (req.file) {
        return [req.file as Express.Multer.File];
    }
    return [];
};

export const uploadImages = async (req: Request, res: Response) => {
    try {
        const files = getFilesFromReq(req);
        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: "No images uploaded."
            });
        }

        const uploaded = [];
        const userId = (req as any).user?.id ?? null;

        for (const file of files) {
            uploaded.push(await processImage(userId, file));
        }

        const firstResult = uploaded[0];
        const mediaUrl = typeof firstResult === "string" ? firstResult : (firstResult as any)?.url || (firstResult as any)?.path || null;

        return res.status(201).json({
            success: true,
            data: uploaded,
            mediaUrl
        });
    } catch (err: any) {
        console.error("Upload images error:", err);
        return res.status(500).json({
            success: false,
            message: err?.message || "Image upload failed."
        });
    }
};

export const uploadVideoController = async (req: Request, res: Response) => {
    try {
        const files = getFilesFromReq(req);
        const file = files[0];

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Video file is required."
            });
        }

        const user = (req as any).user;
        const uploaded = await processMedia(user.id, file);
        const mediaUrl = typeof uploaded === "string" ? uploaded : (uploaded as any)?.url || (uploaded as any)?.path || null;

        return res.status(200).json({
            success: true,
            message: "Video uploaded successfully.",
            data: uploaded,
            mediaUrl
        });
    } catch (err: any) {
        console.error("Upload video error:", err);
        return res.status(500).json({
            success: false,
            message: err?.message || "Video upload failed."
        });
    }
};

export const uploadMedia = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const files = getFilesFromReq(req);

        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: "No media files uploaded."
            });
        }

        const uploaded = [];
        for (const file of files) {
            uploaded.push(await processMedia(user.id, file));
        }

        const firstResult = uploaded[0];
        const mediaUrl = typeof firstResult === "string" ? firstResult : (firstResult as any)?.url || (firstResult as any)?.path || null;

        return res.status(201).json({
            success: true,
            data: uploaded,
            mediaUrl
        });
    } catch (err: any) {
        console.error("Upload media error:", err);
        return res.status(500).json({
            success: false,
            message: err?.message || "Upload failed."
        });
    }
};
