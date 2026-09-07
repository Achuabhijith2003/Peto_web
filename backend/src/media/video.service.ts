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
    output: string,
    hasAudio: boolean = true
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let command = ffmpeg(input)
            .videoCodec("libx264")
            .outputOptions([
                "-preset veryfast",
                "-crf 25",
                "-vf scale='trunc(iw*min(1,1080/iw)/2)*2:trunc(ih*min(1,1080/iw)/2)*2'",
                "-movflags +faststart",
                "-pix_fmt yuv420p"
            ]);

        if (hasAudio) {
            command = command.audioCodec("aac").outputOptions(["-b:a 128k"]);
        } else {
            command = command.noAudio();
        }

        command
            .on("start", cmd => {
                console.log("FFmpeg compression started:", cmd);
            })
            .on("stderr", _line => {
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
): Promise<{ width?: number; height?: number; duration: number; hasAudio: boolean }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(input, (err, metadata) => {
            if (err) return reject(err);

            const video = metadata.streams?.find(
                s => s.codec_type === "video"
            );
            const audio = metadata.streams?.find(
                s => s.codec_type === "audio"
            );

            resolve({
                width: video?.width,
                height: video?.height,
                duration: metadata.format?.duration || 0,
                hasAudio: !!audio
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

        // Read initial metadata from input
        let metadata: { width?: number; height?: number; duration: number; hasAudio: boolean } = {
            width: undefined,
            height: undefined,
            duration: 0,
            hasAudio: true,
        };
        try {
            metadata = await getMetadata(inputPath);
        } catch (probeErr) {
            console.warn("Probe input video warning:", probeErr);
        }

        // Compress video with high quality CRF 25 + FastStart (or fallback to raw)
        let finalVideoPath = inputPath;
        try {
            await compressVideo(
                inputPath,
                outputPath,
                metadata.hasAudio
            );
            finalVideoPath = outputPath;

            // Re-read metadata of compressed output
            try {
                const compressedMeta = await getMetadata(outputPath);
                metadata = { ...metadata, ...compressedMeta };
            } catch (_) {}
        } catch (compErr) {
            console.warn("Video compression failed, falling back to original raw video:", compErr);
            finalVideoPath = inputPath;
        }

        // Upload MP4 video to storage
        const videoUrl = await uploadVideo(
            finalVideoPath,
            `${id}.mp4`
        );

        // Generate and upload thumbnail
        let thumbnailUrl = null;
        try {
            await createThumbnail(finalVideoPath, thumbnailPath);
            thumbnailUrl = await uploadThumbnail(thumbnailPath, `${id}.jpg`);
        } catch (thumbErr) {
            console.warn("Thumbnail generation skipped/failed:", thumbErr);
        }

        // Final file size
        const stats = await fs.stat(finalVideoPath);

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