import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { likePost, unlikePost, getLikes } from "./like.controller";
const router = Router();
router.post("/posts/:id/like", authenticate, likePost);
router.delete("/posts/:id/like", authenticate, unlikePost);
router.get("/posts/:id/likes", authenticate, getLikes);
export default router;
