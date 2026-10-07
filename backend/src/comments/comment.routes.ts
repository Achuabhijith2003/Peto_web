import { Router } from "express";
import {
    createComment,
    getComments,
    updateComment,
    deleteComment
} from "./comment.controller";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import { validateUuidParams } from "../middleware/validateUuid.middleware";

const router = Router();

router.post(
    "/posts/:id/comments",
    authenticate,
    validateUuidParams("id"),
    createComment
);

router.get(
    "/posts/:id/comments",
    optionalAuthenticate,
    validateUuidParams("id"),
    getComments
);

router.patch(
    "/comments/:id",
    authenticate,
    validateUuidParams("id"),
    updateComment
);

router.delete(
    "/comments/:id",
    authenticate,
    validateUuidParams("id"),
    deleteComment
);

export default router;