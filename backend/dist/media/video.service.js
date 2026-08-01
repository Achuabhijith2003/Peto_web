import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import fs from "fs/promises";
import { uploadVideo } from "./storage.service";
import { supabase } from "../config/supabase";
import path from "path";
import crypto from "crypto";
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobe.path);
export async function compressVideo(input, output) {
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
            "-preset", "slow",
            "-vcodec libx264",
            "-b:v 300k",
            "-maxrate 350k",
            "-bufsize 700k",
            "-acodec aac",
            "-b:a 64k",
            "-movflags", "+faststart",
            "-pix_fmt", "yuv420p"
        ])
            .on("start", command => {
            console.log(command);
        })
            .on("stderr", line => {
            console.log(line);
        })
            .on("end", () => resolve())
            .on("error", err => reject(err))
            .save(output);
    });
}
export async function createThumbnail(input, outputPath) {
    const folder = path.dirname(outputPath);
    const filename = path.basename(outputPath);
    await fs.mkdir(folder, { recursive: true });
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .on("end", async () => {
            try {
                // Wait briefly to ensure FFmpeg releases the file handle
                await new Promise(resolve => setTimeout(resolve, 300));
                await fs.access(outputPath);
                resolve();
            }
            catch (err) {
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
export async function getMetadata(input) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(input, (err, metadata) => {
            if (err)
                return reject(err);
            const video = metadata.streams.find(s => s.codec_type === "video");
            resolve({
                width: video?.width,
                height: video?.height,
                duration: metadata.format.duration
            });
        });
    });
}
async function deleteIfExists(file) {
    try {
        await fs.access(file);
        await fs.unlink(file);
        console.log("Deleted:", file);
    }
    catch (err) {
        console.log("Could not delete:", file);
    }
}
export async function processVideo(userId, file) {
    const id = crypto.randomUUID();
    const tempDir = path.join(process.cwd(), "temp");
    await fs.mkdir(tempDir, { recursive: true });
    const inputPath = path.join(tempDir, `${id}-input.mp4`);
    const outputPath = path.join(tempDir, `${id}.mp4`);
    const thumbnailPath = path.join(tempDir, `${id}.jpg`);
    try {
        // Save uploaded file
        await fs.writeFile(inputPath, file.buffer);
        // Compress video
        await compressVideo(inputPath, outputPath);
        // Generate thumbnail
        // await createThumbnail(
        //     outputPath,
        //     `${id}.jpg`
        // );
        // Read metadata
        const metadata = await getMetadata(outputPath);
        // Upload compressed video
        const videoUrl = await uploadVideo(outputPath, `${id}.mp4`);
        // Upload thumbnail
        const thumbnailUrl = await createThumbnail(outputPath, thumbnailPath);
        // Compressed file size
        const stats = await fs.stat(outputPath);
        // Save media record
        const { data, error } = await supabase
            .from("media")
            .insert({
            user_id: userId,
            type: "video",
            url: videoUrl,
            thumbnail_url: thumbnailUrl,
            width: metadata.width,
            height: metadata.height,
            duration: Math.round(metadata.duration),
            size: stats.size,
            mime_type: "video/mp4",
        })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return data;
    }
    finally {
        // Cleanup temp filesF
        await deleteIfExists(inputPath);
        await deleteIfExists(outputPath);
        await deleteIfExists(thumbnailPath);
    }
}
