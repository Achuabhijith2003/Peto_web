import { Router } from "express";
import { bookmarkPost, removeBookmark, getBookmarks } from "./bookmark.controller";
import { authenticate } from "../auth/auth.middleware";
const router = Router();
router.get("/bookmarks", authenticate, getBookmarks);
router.post("/posts/:id/bookmark", authenticate, bookmarkPost);
router.delete("/posts/:id/bookmark", authenticate, removeBookmark);
export default router;
