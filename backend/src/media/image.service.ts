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
    try {
        const input = file.path ? file.path : file.buffer;
        const compressed = await compressImage(input);

        const filename = `${crypto.randomUUID()}.webp`;

        const url = await uploadImageToStorage(
            compressed,
            filename
        );

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

        return data;
    } finally {
        if (file.path) {
            try {
                await fs.unlink(file.path);
            } catch (_) {}
        }
    }
}