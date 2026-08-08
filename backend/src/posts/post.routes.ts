import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";

import { createPost, getPost, updatePost, deletePost, getMyPosts, getUserPosts, getGlobalFeed, searchPosts, getReelsFeed } from "./post.controller";
import { validateUpdatePost } from "./post.validation";

const router = Router();

router.post(
    "/",
    authenticate,
    createPost
);

router.get(
    "/my",
    authenticate,
    getMyPosts
);

router.get(
    "/feed",
    optionalAuthenticate,
    getGlobalFeed
);

router.get(
    "/reels",
    optionalAuthenticate,
    getReelsFeed
);

router.get("/search", optionalAuthenticate, searchPosts);

router.get("/:id", optionalAuthenticate, getPost);

router.patch(
    "/:id",
    authenticate,
    validateUpdatePost,
    updatePost
);

router.delete(
    "/:id",
    authenticate,
    deletePost
);

router.get(
    "/users/:id/posts",
    optionalAuthenticate,
    getUserPosts
);

export default router;