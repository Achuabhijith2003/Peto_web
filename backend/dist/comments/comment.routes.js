import { Router } from "express";
import { createComment, getComments, updateComment, deleteComment } from "./comment.controller";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
const router = Router();
router.post("/posts/:id/comments", authenticate, createComment);
router.get("/posts/:id/comments", optionalAuthenticate, getComments);
router.patch("/comments/:id", authenticate, updateComment);
router.delete("/comments/:id", authenticate, deleteComment);
export default router;
