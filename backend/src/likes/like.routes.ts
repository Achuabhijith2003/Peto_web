import { Router } from "express";

import { authenticate } from "../auth/auth.middleware";
import { validateUuidParams } from "../middleware/validateUuid.middleware";

import {
    likePost,
    unlikePost,
    getLikes
} from "./like.controller";

const router = Router();

router.post(
    "/posts/:id/like",
    authenticate,
    validateUuidParams("id"),
    likePost
);

router.delete(
    "/posts/:id/like",
    authenticate,
    validateUuidParams("id"),
    unlikePost
);

router.get(
    "/posts/:id/likes",
    authenticate,
    validateUuidParams("id"),
    getLikes
);

export default router;