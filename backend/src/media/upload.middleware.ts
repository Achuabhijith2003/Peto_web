import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_MEDIA_MIMES,
  MIME_TO_CANONICAL_EXT,
} from "./fileValidator";

const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const lowerMime = (file.mimetype || "").toLowerCase();
    const canonicalExt = MIME_TO_CANONICAL_EXT[lowerMime] || (lowerMime.startsWith("video/") ? ".mp4" : ".jpg");
    const uniqueName = `${crypto.randomUUID()}${canonicalExt}`;
    cb(null, uniqueName);
  },
});

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_MIMES.includes(mime)) {
    return cb(null, true);
  }
  cb(new Error("Unsupported image format. Allowed formats: JPEG, PNG, WebP"));
};

const videoFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_VIDEO_MIMES.includes(mime)) {
    return cb(null, true);
  }
  cb(new Error("Invalid video format. Allowed formats: MP4, WebM, MOV"));
};

const mediaFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_MEDIA_MIMES.includes(mime)) {
    return cb(null, true);
  }
  cb(new Error("Unsupported file format. Please upload a supported image or video."));
};

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB
  },
  fileFilter: imageFilter,
});

export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: videoFilter,
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: mediaFilter,
});

// Dedicated secure memory storage for sensitive verification documents (No unencrypted disk persistence)
const documentMemoryStorage = multer.memoryStorage();
export const uploadSecureDocumentMiddleware = multer({
  storage: documentMemoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error("Unsupported document type. Only JPEG, PNG, WebP, and PDF files are accepted."));
  },
});
