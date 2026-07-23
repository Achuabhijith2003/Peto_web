import { Router } from "express";

import { authenticate } from "../auth/auth.middleware";


import { createPost, getPost, updatePost, deletePost } from "./post.controller";
import { validateUpdatePost } from "./post.validation";

const router = Router();

router.post(

    "/",

    authenticate,

    createPost

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

export default router;