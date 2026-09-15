import { supabase } from "../config/supabase";
import crypto from "crypto";

export const SECURE_VERIFICATION_BUCKET = "verification-documents";
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Ensures the private storage bucket for sensitive KYC/identity documents exists
 * Strictly configured with public: false to prevent unauthorized direct CDN access.
 */
export async function ensurePrivateVerificationBucket(): Promise<void> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error || !buckets) return;

    const existing = buckets.find((b) => b.name === SECURE_VERIFICATION_BUCKET);
    if (!existing) {
      await supabase.storage.createBucket(SECURE_VERIFICATION_BUCKET, {
        public: false, // MANDATORY: STRICTLY PRIVATE
        fileSizeLimit: MAX_DOCUMENT_FILE_SIZE,
        allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
      });
      console.log(`🔒 Initialized strictly private bucket: ${SECURE_VERIFICATION_BUCKET}`);
    } else if (existing.public) {
      // Security correction: Convert to private if it was accidentally public
      await supabase.storage.updateBucket(SECURE_VERIFICATION_BUCKET, { public: false });
      console.log(`🔒 Updated bucket to strictly private: ${SECURE_VERIFICATION_BUCKET}`);
    }
  } catch (err) {
    console.warn("Secure verification bucket initialization notice:", err);
  }
}

/**
 * Uploads a sensitive identity or business document into the private bucket.
 * The returned path must be stored in verification_documents; never create a public URL.
 */
export async function uploadSecureDocument(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  applicationId: string
): Promise<{ storagePath: string; fileSizeBytes: number; mimeType: string }> {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType.toLowerCase())) {
    const err: any = new Error(
      `Unsupported document format (${mimeType}). Accepted formats: JPEG, PNG, WebP, PDF.`
    );
    err.status = 400;
    throw err;
  }

  if (fileBuffer.length > MAX_DOCUMENT_FILE_SIZE) {
    const err: any = new Error("Document exceeds maximum allowed size of 10MB.");
    err.status = 400;
    throw err;
  }

  const ext = originalFilename.split(".").pop()?.toLowerCase() || "bin";
  const sanitizedExt = ["jpg", "jpeg", "png", "webp", "pdf"].includes(ext) ? ext : "dat";
  const documentId = crypto.randomUUID();
  const storagePath = `${applicationId}/${documentId}.${sanitizedExt}`;

  const { error } = await supabase.storage
    .from(SECURE_VERIFICATION_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to securely persist document: ${error.message}`);
  }

  return {
    storagePath,
    fileSizeBytes: fileBuffer.length,
    mimeType,
  };
}

/**
 * Creates a short-lived signed URL for authorized verification reviewers only.
 * The URL expires automatically after the specified seconds (default: 300s / 5 minutes).
 */
export async function generateSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SECURE_VERIFICATION_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Could not generate secure view token: ${error?.message || "Invalid path"}`);
  }

  return data.signedUrl;
}

/**
 * Masks sensitive national ID, passport, or registration numbers.
 * Example: '1234567890' -> 'XXXX-XXXX-7890'
 */
export function maskSensitiveIdentifier(rawNumber?: string | null): string {
  if (!rawNumber) return "";
  const cleaned = rawNumber.trim().replace(/\s+/g, "");
  if (cleaned.length <= 4) return "****";
  const lastFour = cleaned.slice(-4);
  const prefixLength = cleaned.length - 4;
  const maskedPrefix = "X".repeat(Math.min(prefixLength, 8));
  return `${maskedPrefix}-${lastFour}`;
}
