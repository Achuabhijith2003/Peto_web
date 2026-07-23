import { Router } from "express";

import { authenticate } from "../auth/auth.middleware";


import { createPost, getPost, updatePost, deletePost, getMyPosts, getUserPosts } from "./post.controller";
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

router.get("/:id", authenticate, getPost);

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
    authenticate,
    getUserPosts
);


export default router;