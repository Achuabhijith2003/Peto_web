import { supabase } from "../config/supabase";
import fs from "fs/promises";

export async function uploadImageToStorage(
    file: Buffer,
    filename: string
) {
    const path = filename;

    const { error } = await supabase.storage
        .from("posts-images")
        .upload(path, file, {
            contentType: "image/webp",
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data } = supabase.storage
        .from("posts-images")
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function uploadVideo(
    filePath: string,
    filename: string
) {
    const buffer = await fs.readFile(filePath);
    const path = filename;

    const { error } = await supabase.storage
        .from("posts-videos")
        .upload(path, buffer, {
            contentType: "video/mp4"
        });

    if (error) throw error;

    return supabase.storage
        .from("posts-videos")
        .getPublicUrl(path)
        .data.publicUrl;
}

export async function uploadThumbnail(
    filePath: string,
    filename: string
) {
    const buffer = await fs.readFile(filePath);
    const path = filename;

    const { error } = await supabase.storage
        .from("thumbnails")
        .upload(path, buffer);

    if (error) throw error;

    return supabase.storage
        .from("thumbnails")
        .getPublicUrl(path)
        .data.publicUrl;
}




export async function deleteStorageFile(
    fileUrl: string
) {

    if (!fileUrl) return;

    const parts = fileUrl.split("/");

    const bucket = parts[parts.length - 2];

    const file = parts[parts.length - 1];

    await supabase.storage

        .from(bucket)

        .remove([file]);

}