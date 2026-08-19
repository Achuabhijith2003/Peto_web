import { supabase } from "../config/supabase";
import fs from "fs/promises";

export async function ensurePublicBuckets() {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error || !buckets) return;

        const requiredBuckets = [
            { name: "posts-videos", limit: 200 * 1024 * 1024 },
            { name: "posts-images", limit: 30 * 1024 * 1024 },
            { name: "thumbnails", limit: 10 * 1024 * 1024 },
            { name: "avatars", limit: 10 * 1024 * 1024 },
            { name: "covers", limit: 15 * 1024 * 1024 },
        ];

        for (const item of requiredBuckets) {
            const existing = buckets.find((b) => b.name === item.name);
            if (!existing) {
                await supabase.storage.createBucket(item.name, {
                    public: true,
                    fileSizeLimit: item.limit,
                });
                console.log(`✅ Created public storage bucket: ${item.name}`);
            } else if (!existing.public) {
                await supabase.storage.updateBucket(item.name, { public: true });
                console.log(`✅ Updated storage bucket to public: ${item.name}`);
            }
        }
    } catch (err) {
        console.warn("Storage bucket check warning:", err);
    }
}

export async function uploadImageToStorage(
    file: Buffer,
    filename: string
) {
    const path = filename;

    const { error } = await supabase.storage
        .from("posts-images")
        .upload(path, file, {
            contentType: "image/webp",
            upsert: true
        });

    if (error) {
        throw error;
    }

    const { data } = supabase.storage
        .from("posts-images")
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function uploadAvatarToStorage(
    file: Buffer,
    filename: string,
    contentType: string = "image/jpeg"
) {
    const path = filename;

    const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
            contentType,
            upsert: true
        });

    if (error) {
        throw error;
    }

    const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function uploadCoverToStorage(
    file: Buffer,
    filename: string,
    contentType: string = "image/jpeg"
) {
    const path = filename;

    const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, {
            contentType,
            upsert: true
        });

    if (error) {
        throw error;
    }

    const { data } = supabase.storage
        .from("covers")
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
            contentType: "video/mp4",
            upsert: true
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
        .upload(path, buffer, {
            upsert: true
        });

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