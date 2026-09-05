

import path from "path";
import { processImage } from "./image.service";
import { processVideo } from "./video.service";

export async function processMedia(
    userId: string,
    file: Express.Multer.File
) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const isVideo = file.mimetype.startsWith("video/") || [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext);
    const isImage = file.mimetype.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"].includes(ext);

    if (isImage) {
        return await processImage(
            userId,
            file
        );
    }

    if (isVideo) {
        return await processVideo(
            userId,
            file
        );
    }

    throw new Error("Unsupported file type");
}