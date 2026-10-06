import fs from "fs/promises";
import fsSync from "fs";

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export const ALLOWED_MEDIA_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_VIDEO_MIMES,
];

export const MIME_TO_CANONICAL_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export type DetectedMediaType = "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm" | "video/quicktime" | null;

/**
 * Inspect buffer magic bytes / file signature to determine true file type.
 */
export function detectFileTypeFromBuffer(buffer: Buffer): {
  mime: DetectedMediaType;
  isImage: boolean;
  isVideo: boolean;
  isActiveContent: boolean;
  canonicalExt: string | null;
} {
  if (!buffer || buffer.length < 4) {
    return { mime: null, isImage: false, isVideo: false, isActiveContent: false, canonicalExt: null };
  }

  // 1. Detect Active / Executable / Script content (HTML, SVG, XML, PE, ELF)
  // Check first 512 bytes as ASCII/UTF-8
  const headerText = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8");
  const activeContentRegex = /^\s*(<!DOCTYPE\s+html|<html|<script|<\?xml|<svg|<body|<iframe|<object)/i;
  const isSvg = /^\s*(<\?xml[^>]*>)?\s*<svg/i.test(headerText) || headerText.includes("<svg");

  if (activeContentRegex.test(headerText) || isSvg) {
    return { mime: null, isImage: false, isVideo: false, isActiveContent: true, canonicalExt: null };
  }

  // Check PE executable (MZ) or ELF
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    // Windows PE executable
    return { mime: null, isImage: false, isVideo: false, isActiveContent: true, canonicalExt: null };
  }
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    // Linux ELF executable
    return { mime: null, isImage: false, isVideo: false, isActiveContent: true, canonicalExt: null };
  }

  // 2. JPEG: 0xFF, 0xD8, 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", isImage: true, isVideo: false, isActiveContent: false, canonicalExt: ".jpg" };
  }

  // 3. PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", isImage: true, isVideo: false, isActiveContent: false, canonicalExt: ".png" };
  }

  // 4. WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: "image/webp", isImage: true, isVideo: false, isActiveContent: false, canonicalExt: ".webp" };
  }

  // 5. MP4 / MOV / QuickTime: bytes 4..7 ftyp, moov, or mdat
  if (buffer.length >= 8) {
    const boxType = buffer.subarray(4, 8).toString("latin1");
    if (boxType === "ftyp") {
      const brand = buffer.subarray(8, Math.min(buffer.length, 12)).toString("latin1");
      if (brand.startsWith("qt")) {
        return { mime: "video/quicktime", isImage: false, isVideo: true, isActiveContent: false, canonicalExt: ".mov" };
      }
      return { mime: "video/mp4", isImage: false, isVideo: true, isActiveContent: false, canonicalExt: ".mp4" };
    }
    if (boxType === "moov" || boxType === "mdat" || boxType === "wide" || boxType === "skip") {
      return { mime: "video/quicktime", isImage: false, isVideo: true, isActiveContent: false, canonicalExt: ".mov" };
    }
  }

  // 6. WebM / Matroska: 0x1A, 0x45, 0xDF, 0xA3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { mime: "video/webm", isImage: false, isVideo: true, isActiveContent: false, canonicalExt: ".webm" };
  }

  return { mime: null, isImage: false, isVideo: false, isActiveContent: false, canonicalExt: null };
}

/**
 * Validate an uploaded file from disk or buffer against magic bytes and expected media category.
 * If validation fails, immediately unlinks the temporary file to prevent orphaned disk files.
 */
export async function validateUploadedFile(
  file: Express.Multer.File,
  expectedCategory: "image" | "video" | "any"
): Promise<{
  valid: boolean;
  mime: string;
  canonicalExt: string;
  error?: string;
}> {
  let headerBuffer: Buffer | null = null;

  try {
    if (file.buffer && file.buffer.length > 0) {
      headerBuffer = file.buffer.subarray(0, Math.min(file.buffer.length, 4096));
    } else if (file.path && fsSync.existsSync(file.path)) {
      const handle = await fs.open(file.path, "r");
      try {
        const tempBuf = Buffer.alloc(4096);
        const { bytesRead } = await handle.read(tempBuf, 0, 4096, 0);
        headerBuffer = tempBuf.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    }
  } catch (readErr: any) {
    // If reading failed, clean up and reject
    await cleanupFile(file);
    return {
      valid: false,
      mime: "",
      canonicalExt: "",
      error: "Unable to read uploaded file for security validation.",
    };
  }

  if (!headerBuffer || headerBuffer.length === 0) {
    await cleanupFile(file);
    return {
      valid: false,
      mime: "",
      canonicalExt: "",
      error: "Uploaded file is empty.",
    };
  }

  const detection = detectFileTypeFromBuffer(headerBuffer);

  // Active content (HTML, SVG, scripts, executables) rejected
  if (detection.isActiveContent) {
    await cleanupFile(file);
    return {
      valid: false,
      mime: "",
      canonicalExt: "",
      error: "Security validation error: Active content, scripts, SVG, or executable files are not accepted.",
    };
  }

  if (!detection.mime || !detection.canonicalExt) {
    await cleanupFile(file);
    return {
      valid: false,
      mime: "",
      canonicalExt: "",
      error: "Security validation error: File signature does not match any supported JPEG, PNG, WebP, or MP4/WebM media format.",
    };
  }

  // Category enforcement
  if (expectedCategory === "image" && !detection.isImage) {
    await cleanupFile(file);
    return {
      valid: false,
      mime: detection.mime,
      canonicalExt: detection.canonicalExt,
      error: "Invalid file type: Image endpoint only accepts valid JPEG, PNG, or WebP images.",
    };
  }

  if (expectedCategory === "video" && !detection.isVideo) {
    await cleanupFile(file);
    return {
      valid: false,
      mime: detection.mime,
      canonicalExt: detection.canonicalExt,
      error: "Invalid file type: Video endpoint only accepts valid MP4, WebM, or QuickTime videos.",
    };
  }

  return {
    valid: true,
    mime: detection.mime,
    canonicalExt: detection.canonicalExt,
  };
}

/**
 * Remove temporary file from disk safely
 */
export async function cleanupFile(file: Express.Multer.File): Promise<void> {
  if (file?.path) {
    try {
      if (fsSync.existsSync(file.path)) {
        await fs.unlink(file.path);
      }
    } catch (_) {}
  }
}
