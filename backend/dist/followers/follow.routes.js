import { Router } from "express";
import { follow, unfollow, followStatus, followers, following, suggestedFriends } from "./follow.controller";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
const router = Router();
router.get("/suggested", optionalAuthenticate, suggestedFriends);
/*
    POST /api/users/:id/follow
*/
router.post("/:id/follow", authenticate, follow);
/*
    DELETE /api/users/:id/follow
*/
router.delete("/:id/follow", authenticate, unfollow);
/*
    GET /api/users/:id/follow-status
*/
router.get("/:id/follow-status", optionalAuthenticate, followStatus);
/*
    GET /api/users/:id/followers
*/
router.get("/:id/followers", optionalAuthenticate, followers);
/*
    GET /api/users/:id/following
*/
router.get("/:id/following", optionalAuthenticate, following);
export default router;
