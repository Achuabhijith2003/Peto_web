import sharp from "sharp";
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { uploadImageToStorage } from "./storage.service";
export async function compressImage(buffer) {
    return sharp(buffer)
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
export async function processImage(userId, file) {
    const compressed = await compressImage(file.buffer);
    const filename = `${crypto.randomUUID()}.webp`;
    const url = await uploadImageToStorage(compressed, filename);
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
    if (error)
        throw error;
    return data;
}
