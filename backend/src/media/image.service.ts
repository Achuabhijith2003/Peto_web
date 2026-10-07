import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";

import { supabase } from "../config/supabase";
import { uploadImageToStorage } from "./storage.service";

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
    file: Express.Multer.File
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

        const { data, error } = await supabase
            .from("media")
            .insert({
                user_id: userId,
                type: "image",
                url,
                size: compressed.length,
                mime_type: "image/webp"
            })
            .select()
            .single();

        if (error) throw error;

        mediaSaved = true;

        return data;
    } catch (error) {
        if (uploadedFilename && !mediaSaved) {
            await supabase.storage.from("posts-images").remove([uploadedFilename]);
        }
        throw error;
    } finally {
        if (file.path) {
            try {
                await fs.unlink(file.path);
            } catch (_) {}
        }
    }
}