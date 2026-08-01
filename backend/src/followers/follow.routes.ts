import { Router } from "express";

import {
    follow,
    unfollow,
    followStatus,
    followers,
    following,
    suggestedFriends
} from "./follow.controller";

import { authenticate } from "../auth/auth.middleware";

const router = Router();

router.get(
    "/suggested",
    authenticate,
    suggestedFriends
);

/*
    POST /api/users/:id/follow
*/
router.post(
    "/:id/follow",
    authenticate,
    follow
);

/*
    DELETE /api/users/:id/follow
*/
router.delete(
    "/:id/follow",
    authenticate,
    unfollow
);

/*
    GET /api/users/:id/follow-status
*/
router.get(
    "/:id/follow-status",
    authenticate,
    followStatus
);

/*
    GET /api/users/:id/followers
*/
router.get(
    "/:id/followers",
    authenticate,
    followers
);

/*
    GET /api/users/:id/following
*/
router.get(
    "/:id/following",
    authenticate,
    following
);

export default router;