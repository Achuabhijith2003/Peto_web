import multer from "multer";
const storage = multer.memoryStorage();
const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic"
];
const fileFilter = (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Unsupported image format"));
    }
    cb(null, true);
};
export const uploadImage = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024 //20MB
    },
    fileFilter
});
export const uploadVideo = multer({
    storage,
    limits: {
        fileSize: 200 * 1024 * 1024
    },
    fileFilter(req, file, cb) {
        const allowed = [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-matroska",
            "video/x-msvideo"
        ];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Invalid video format"));
        }
        cb(null, true);
    }
});
export const upload = multer({
    storage,
    limits: {
        fileSize: 200 * 1024 * 1024
    }
});
