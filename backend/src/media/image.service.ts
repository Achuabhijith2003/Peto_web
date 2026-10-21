import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";

import { supabase } from "../config/supabase";
import { uploadImageToStorage } from "./storage.service";
import { saveMediaRecord } from "./mediaRecord.service";

export async function compressImage(
    input: Buffer | string
): Promise<Buffer> {
    return sharp(input)
        .rotate()
        .resize({
            width: 1920,
            withoutEnlargement: true
        })
        .webp({
            quality: 82,
            effort: 6
        })
        .toBuffer();
}

export async function processImage(
    userId: string,
    file: Express.Multer.File,
    requestId?: string
) {
    let uploadedFilename: string | null = null;
    let mediaSaved = false;
    try {
        const input = file.path ? file.path : file.buffer;
        const compressed = await compressImage(input);

        const filename = `${crypto.randomUUID()}.webp`;

        const url = await uploadImageToStorage(
            compressed,
            filename
        );
        uploadedFilename = filename;

        const { data, created } = await saveMediaRecord({
                user_id: userId,
                type: "image",
                url,
                size: compressed.length,
                mime_type: "image/webp"
            }, requestId);

        mediaSaved = created;

        return data;
    } finally {
        if (uploadedFilename && !mediaSaved) {
            await supabase.storage.from("posts-images").remove([uploadedFilename]);
        }
        if (file.path) {
            try {
                await fs.unlink(file.path);
            } catch (_) {}
        }
    }
}