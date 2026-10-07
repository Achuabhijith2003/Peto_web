import { supabase } from "../config/supabase";
import path from "path";
import crypto from "crypto";

export const PET_MEDIA_PRIVATE_BUCKET = "pet-media-private";
export const PROTECTED_SIGNED_URL_TTL_SECONDS = 300; // 5 minutes TTL

/**
 * Ensures the strictly private storage bucket for protected pet media exists.
 * Configured with public: false.
 */
export async function ensurePetMediaPrivateBucket(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error || !buckets) return;

    const existing = buckets.find((b) => b.name === PET_MEDIA_PRIVATE_BUCKET);
    if (!existing) {
      await supabase.storage.createBucket(PET_MEDIA_PRIVATE_BUCKET, {
        public: false, // MANDATORY: STRICTLY PRIVATE
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });
      console.log(`🔒 Initialized strictly private bucket: ${PET_MEDIA_PRIVATE_BUCKET}`);
    } else if (existing.public) {
      await supabase.storage.updateBucket(PET_MEDIA_PRIVATE_BUCKET, { public: false });
      console.log(`🔒 Updated bucket to strictly private: ${PET_MEDIA_PRIVATE_BUCKET}`);
    }
  } catch (err) {
    console.warn("Private pet media bucket initialization warning:", err);
  }
}

/**
 * Generates a short-lived signed URL for a protected pet media object.
 */
export async function generateSignedPetMediaUrl(
  storagePath: string,
  expiresInSeconds: number = PROTECTED_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  if (!storagePath) {
    throw new Error("Cannot generate signed URL for empty storage path");
  }

  const { data, error } = await supabase.storage
    .from(PET_MEDIA_PRIVATE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed pet media URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Parses bucket name and object path from a Supabase Storage URL.
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;

  // Pattern: /storage/v1/object/public/<bucket>/<path>
  // or /storage/v1/object/sign/<bucket>/<path>?token=...
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (publicMatch) {
    return { bucket: publicMatch[1], path: publicMatch[2] };
  }

  const signMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/);
  if (signMatch) {
    return { bucket: signMatch[1], path: signMatch[2] };
  }

  // Handle custom private scheme: private://<bucket>/<path>
  const customMatch = url.match(/^private:\/\/([^/]+)\/(.+)$/);
  if (customMatch) {
    return { bucket: customMatch[1], path: customMatch[2] };
  }

  return null;
}

/**
 * Copies a public storage object into the private bucket and removes the public object.
 * Used during restrictive visibility transitions or when uploading to a protected pet.
 */
export async function moveMediaToPrivate(
  publicUrl: string,
  petId: string,
  mediaId: string
): Promise<{ storageBucket: string; storagePath: string }> {
  const parsed = parseStorageUrl(publicUrl);
  if (!parsed) {
    throw new Error(`Unable to parse storage location from URL: ${publicUrl}`);
  }

  // If already in private bucket, return existing path
  if (parsed.bucket === PET_MEDIA_PRIVATE_BUCKET) {
    return { storageBucket: PET_MEDIA_PRIVATE_BUCKET, storagePath: parsed.path };
  }

  // 1. Download file binary from source public bucket
  const { data: blob, error: downloadError } = await supabase.storage
    .from(parsed.bucket)
    .download(parsed.path);

  if (downloadError || !blob) {
    throw new Error(`Failed to download public media object for privatizing: ${downloadError?.message}`);
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const ext = path.extname(parsed.path) || ".webp";
  const privatePath = `pets/${petId}/${mediaId}${ext}`;

  // 2. Upload into strictly private bucket
  const contentType = blob.type || (ext === ".mp4" ? "video/mp4" : "image/webp");
  const { error: uploadError } = await supabase.storage
    .from(PET_MEDIA_PRIVATE_BUCKET)
    .upload(privatePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to persist media to private storage: ${uploadError.message}`);
  }

  // 3. Verify object exists in private storage before deleting public object
  const { data: verifyData, error: verifyError } = await supabase.storage
    .from(PET_MEDIA_PRIVATE_BUCKET)
    .createSignedUrl(privatePath, 30);

  if (verifyError || !verifyData?.signedUrl) {
    // Fail closed: keep public object for retry, do not delete public object
    throw new Error("Private object verification failed after upload.");
  }

  // 4. Safely remove original public object so public URL no longer functions
  try {
    await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  } catch (removeErr: any) {
    console.warn("Warning deleting public copy after move to private:", removeErr.message);
  }

  return {
    storageBucket: PET_MEDIA_PRIVATE_BUCKET,
    storagePath: privatePath,
  };
}

/**
 * Moves a private pet media object to the public bucket.
 * Used when a protected pet is made PUBLIC.
 */
export async function moveMediaToPublic(
  privateStoragePath: string,
  targetBucket: string = "posts-images"
): Promise<{ publicUrl: string; storageBucket: string; storagePath: string }> {
  // 1. Download from private bucket
  const { data: blob, error: downloadError } = await supabase.storage
    .from(PET_MEDIA_PRIVATE_BUCKET)
    .download(privateStoragePath);

  if (downloadError || !blob) {
    throw new Error(`Failed to download private media for publishing: ${downloadError?.message}`);
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const ext = path.extname(privateStoragePath) || ".webp";
  const newPublicFilename = `${crypto.randomUUID()}${ext}`;
  const contentType = blob.type || (ext === ".mp4" ? "video/mp4" : "image/webp");

  // 2. Upload to public bucket
  const { error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(newPublicFilename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to publish media to public bucket: ${uploadError.message}`);
  }

  const { data: pubData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(newPublicFilename);

  // 3. Remove private object
  try {
    await supabase.storage.from(PET_MEDIA_PRIVATE_BUCKET).remove([privateStoragePath]);
  } catch (removeErr: any) {
    console.warn("Warning deleting private copy after publishing:", removeErr.message);
  }

  return {
    publicUrl: pubData.publicUrl,
    storageBucket: targetBucket,
    storagePath: newPublicFilename,
  };
}

/**
 * Removes a private pet media object from storage.
 */
export async function deletePrivatePetMedia(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await supabase.storage.from(PET_MEDIA_PRIVATE_BUCKET).remove([storagePath]);
  } catch (err: any) {
    console.warn("Failed to delete private pet media:", err.message);
  }
}

/**
 * Removes all private storage objects associated with a pet.
 */
export async function deletePetPrivateStorageFolder(petId: string): Promise<void> {
  if (!petId) return;
  try {
    const { data: files } = await supabase.storage
      .from(PET_MEDIA_PRIVATE_BUCKET)
      .list(`pets/${petId}`);

    if (files && files.length > 0) {
      const pathsToRemove = files.map((f) => `pets/${petId}/${f.name}`);
      await supabase.storage.from(PET_MEDIA_PRIVATE_BUCKET).remove(pathsToRemove);
    }
  } catch (err: any) {
    console.warn("Failed to clean up pet private storage folder:", err.message);
  }
}
