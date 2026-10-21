import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import fs from "fs/promises";
import { uploadThumbnail, uploadVideo } from "./storage.service";
import { supabase } from "../config/supabase";
import path from "path";
import crypto from "crypto";
import { saveMediaRecord } from "./mediaRecord.service";

ffmpeg.setFfmpegPath(ffmpegPath!);
ffmpeg.setFfprobePath(ffprobe.path);

export async function compressVideo(
    input: string,
    output: string,
    hasAudio: boolean = true
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let lastProgressLog = 0;
        let command = ffmpeg(input, { timeout: 180 })
            .videoCodec("libx264")
            .outputOptions([
                "-preset veryfast",
                "-crf 25",
                "-threads 2",
                "-filter_threads 1",
                "-map 0:v:0",
                "-vf scale='trunc(iw*min(1,min(1080/iw,1080/ih))/2)*2:trunc(ih*min(1,min(1080/iw,1080/ih))/2)*2'",
                "-movflags +faststart",
                "-pix_fmt yuv420p"
            ]);

        if (hasAudio) {
            command = command.audioCodec("aac").outputOptions(["-map 0:a:0?", "-b:a 128k"]);
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
            .on("progress", progress => {
                if (Date.now() - lastProgressLog >= 15000) {
                    lastProgressLog = Date.now();
                    console.log("Video compression progress:", JSON.stringify({
                        uploadId: path.basename(output, ".mp4"),
                        timemark: progress.timemark,
                        percent: progress.percent,
                    }));
                }
            })
            .on("end", () => {
                console.log("Video compression completed:", path.basename(output, ".mp4"));
                resolve();
            })
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
        ffmpeg(input, { timeout: 20 })
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
            .seekInput(0)
            .frames(1)
            .outputOptions(["-threads 1", "-filter_threads 1"])
            .size("720x?")
            .save(path.join(folder, filename));
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
    file: Express.Multer.File,
    requestId?: string
) {
    const id = crypto.randomUUID();
    const tempDir = path.join(process.cwd(), "temp");

    await fs.mkdir(tempDir, { recursive: true });

    // If file was streamed to disk via multer diskStorage, use file.path directly
    const inputPath = file.path ? file.path : path.join(tempDir, `${id}-input.mp4`);
    const outputPath = path.join(tempDir, `${id}.mp4`);
    const thumbnailPath = path.join(tempDir, `${id}.jpg`);
    let uploadedVideo = false;
    let uploadedThumbnail = false;
    let mediaSaved = false;
    let stage = "probe";
    const startedAt = Date.now();
    const reportStage = (next: string, details: Record<string, unknown> = {}) => {
        stage = next;
        console.log("Video upload stage:", JSON.stringify({
            uploadId: id, stage, elapsedMs: Date.now() - startedAt, ...details,
        }));
    };

    try {
        // If file was in memory (no disk path), save buffer to disk
        if (!file.path && file.buffer) {
            await fs.writeFile(inputPath, file.buffer);
        }

        reportStage("probe", { inputBytes: file.size });
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

        reportStage("compression", { ...metadata });
        // A raw MOV/HEVC file cannot safely be relabelled as a browser MP4.
        await compressVideo(inputPath, outputPath, metadata.hasAudio);
        const finalVideoPath = outputPath;

        // Re-read metadata of compressed output.
        try {
            const compressedMeta = await getMetadata(outputPath);
            metadata = { ...metadata, ...compressedMeta };
        } catch (_) {}
        // Upload MP4 video to storage
        const stats = await fs.stat(finalVideoPath);
        reportStage("storage_video", { outputBytes: stats.size });
        const videoUrl = await uploadVideo(
            finalVideoPath,
            `${id}.mp4`
        );
        uploadedVideo = true;

        // Generate and upload thumbnail
        let thumbnailUrl = null;
        reportStage("thumbnail");
        try {
            await createThumbnail(finalVideoPath, thumbnailPath);
            thumbnailUrl = await uploadThumbnail(thumbnailPath, `${id}.jpg`);
            uploadedThumbnail = true;
        } catch (thumbErr) {
            console.warn("Thumbnail generation skipped/failed:", thumbErr);
        }

        // Save media record in Supabase
        reportStage("database");
        const { data, created } = await saveMediaRecord({
                user_id: userId,
                type: "video",
                url: videoUrl,
                thumbnail_url: thumbnailUrl,
                width: metadata.width || null,
                height: metadata.height || null,
                duration: Math.round(metadata.duration || 0),
                size: stats.size,
                mime_type: "video/mp4",
            }, requestId);

        mediaSaved = created;
        reportStage("complete", { mediaId: data.id });

        return data;
    } catch (error) {
        console.error("Video upload failed:", JSON.stringify({
            uploadId: id, stage, elapsedMs: Date.now() - startedAt,
            message: (error as any)?.message || "Unknown error",
            code: (error as any)?.code,
            statusCode: (error as any)?.statusCode,
        }));
        throw new Error(`Video upload failed during ${stage}. Reference: ${id}. Please try again or share this reference with support.`);
    } finally {
        // Storage and DB writes are separate. Reclaim only objects created by
        // this invocation if no authoritative media row was committed.
        if (!mediaSaved) {
            if (uploadedThumbnail) {
                await supabase.storage.from("thumbnails").remove([`${id}.jpg`]);
            }
            if (uploadedVideo) {
                await supabase.storage.from("posts-videos").remove([`${id}.mp4`]);
            }
        }
        // Cleanup temp files
        await deleteIfExists(inputPath);
        await deleteIfExists(outputPath);
        await deleteIfExists(thumbnailPath);
        if (file.path && file.path !== inputPath) {
            await deleteIfExists(file.path);
        }
    }
}
