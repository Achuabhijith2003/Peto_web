import multer from "multer";

const storage = multer.memoryStorage();

const imageFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/octet-stream") {
    return cb(null, true);
  }
  cb(new Error("Unsupported image format"));
};

const videoFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream") {
    return cb(null, true);
  }
  cb(new Error("Invalid video format"));
};

const mediaFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/octet-stream"
  ) {
    return cb(null, true);
  }
  cb(new Error("Unsupported file format. Please upload an image or video."));
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