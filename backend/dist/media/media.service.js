import { processImage } from "./image.service";
import { processVideo } from "./video.service";
// export async function processImage(
//     userId: string,
//     file: Express.Multer.File
// ) {
//     const compressed = await compressImage(file.buffer);
//     const filename = `${crypto.randomUUID()}.webp`;
//     const url = await uploadImageToStorage(
//         compressed,
//         filename
//     );
//     return {
//         type: "image",
//         url,
//         size: compressed.length,
//         mime_type: "image/webp"
//     };
// }
export async function processMedia(userId, file) {
    if (file.mimetype.startsWith("image/")) {
        return await processImage(userId, file);
    }
    if (file.mimetype.startsWith("video/")) {
        return await processVideo(userId, file);
    }
    throw new Error("Unsupported file type");
}
