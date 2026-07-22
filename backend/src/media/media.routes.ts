import { Router } from "express";

import { authenticate } from "../auth/auth.middleware";

import { uploadImage,uploadVideo } from "./upload.middleware";

import { uploadImages,uploadVideoController  } from "./media.controller";

import { upload } from "./upload.middleware";

import { uploadMedia } from "./media.controller";

const router = Router();

router.post(

    "/image",

    authenticate,

    uploadImage.array("images", 10),

    uploadImages

);

router.post(

    "/video",

    authenticate,

    uploadVideo.single("video"),

    uploadVideoController

);

router.post(

    "/upload",

    authenticate,

    upload.array("media", 10),

    uploadMedia

);

export default router;