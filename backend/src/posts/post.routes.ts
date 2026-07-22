import { Router } from "express";

import { authenticate } from "../auth/auth.middleware";

import { createPost } from "./post.controller";

const router = Router();

router.post(

    "/",

    authenticate,

    createPost

);

export default router;