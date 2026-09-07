

import path from "path";
import { processImage } from "./image.service";
import { processVideo } from "./video.service";

export async function processMedia(
    userId: string,
    file: Express.Multer.File
) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp", ".m4v", ".ts", ".flv"];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic", ".heif"];

    const isVideo = file.mimetype.startsWith("video/") || videoExtensions.includes(ext);
    const isImage = file.mimetype.startsWith("image/") || imageExtensions.includes(ext);

    if (isVideo) {
        return await processVideo(
            userId,
            file
        );
    }

    if (isImage) {
        return await processImage(
            userId,
            file
        );
    }

    throw new Error("Unsupported file type");
}