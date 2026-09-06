import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import fs from "fs/promises";
import { uploadThumbnail, uploadVideo } from "./storage.service";
import { supabase } from "../config/supabase";
import path from "path";
import crypto from "crypto";

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobe.path);

export async function compressVideo(
    input: string,
    output: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        ffmpeg(input)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
                "-preset veryfast",
                "-crf 25",
                "-vf scale='min(1080,iw)':-2",
                "-b:a 128k",
                "-movflags +faststart",
                "-pix_fmt yuv420p"
            ])
            .on("start", command => {
                console.log("FFmpeg compression started:", command);
            })
            .on("stderr", line => {
                // Keep verbose logs suppressed unless debugging
            })
            .on("end", () => resolve())
            .on("error", err => {
                console.error("FFmpeg compression error:", err);
                reject(err);
            })
            .save(output);
    });
}

export async function createThumbnail(
    input: string,
    outputPath: string
): Promise<void> {
    const folder = path.dirname(outputPath);
    const filename = path.basename(outputPath);

    await fs.mkdir(folder, { recursive: true });

    return new Promise<void>((resolve, reject) => {
        ffmpeg(input)
            .on("end", async () => {
                try {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await fs.access(outputPath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
            .on("error", (err) => {
                reject(err);
            })
            .screenshots({
                count: 1,
                folder,
                filename,
                size: "720x?"
            });
    });
}

export async function getMetadata(
    input: string
) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(input, (err, metadata) => {
            if (err) return reject(err);

            const video = metadata.streams.find(
                s => s.codec_type === "video"
            );

            resolve({
                width: video?.width,
                height: video?.height,
                duration: metadata.format.duration || 0
            });
        });
    });
}

async function deleteIfExists(file: string) {
    try {
        await fs.access(file);
        await fs.unlink(file);
        console.log("Deleted temp file:", file);
    } catch (err) {
        // Ignore if file doesn't exist
    }
}

export async function processVideo(
    userId: string,
    file: Express.Multer.File
) {
    const id = crypto.randomUUID();
    const tempDir = path.join(process.cwd(), "temp");

    await fs.mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, `${id}-input.mp4`);
    const outputPath = path.join(tempDir, `${id}.mp4`);
    const thumbnailPath = path.join(tempDir, `${id}.jpg`);

    try {
        // Save uploaded raw file
        await fs.writeFile(inputPath, file.buffer);

        // Compress video with high quality CRF 23 + FastStart
        await compressVideo(
            inputPath,
            outputPath
        );

        // Read metadata
        const metadata: any = await getMetadata(outputPath);

        // Upload compressed MP4 video to storage
        const videoUrl = await uploadVideo(
            outputPath,
            `${id}.mp4`
        );

        // Generate and upload thumbnail
        let thumbnailUrl = null;
        try {
            await createThumbnail(outputPath, thumbnailPath);
            thumbnailUrl = await uploadThumbnail(thumbnailPath, `${id}.jpg`);
        } catch (thumbErr) {
            console.warn("Thumbnail generation skipped/failed:", thumbErr);
        }

        // Compressed file size
        const stats = await fs.stat(outputPath);

        // Save media record in Supabase
        const { data, error } = await supabase
            .from("media")
            .insert({
                user_id: userId,
                type: "video",
                url: videoUrl,
                thumbnail_url: thumbnailUrl,
                width: metadata.width || null,
                height: metadata.height || null,
                duration: Math.round(metadata.duration || 0),
                size: stats.size,
                mime_type: "video/mp4",
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } finally {
        // Cleanup temp files
        await deleteIfExists(inputPath);
        await deleteIfExists(outputPath);
        await deleteIfExists(thumbnailPath);
    }
}