import { Router } from "express";

import {
    follow,
    unfollow,
    followStatus,
    followers,
    following,
    suggestedFriends
} from "./follow.controller";

import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import { validateUuidParams } from "../middleware/validateUuid.middleware";

const router = Router();

router.get(
    "/suggested",
    optionalAuthenticate,
    suggestedFriends
);

/*
    POST /api/users/:id/follow
*/
router.post(
    "/:id/follow",
    authenticate,
    validateUuidParams("id"),
    follow
);

/*
    DELETE /api/users/:id/follow
*/
router.delete(
    "/:id/follow",
    authenticate,
    validateUuidParams("id"),
    unfollow
);

/*
    GET /api/users/:id/follow-status
*/
router.get(
    "/:id/follow-status",
    optionalAuthenticate,
    validateUuidParams("id"),
    followStatus
);

/*
    GET /api/users/:id/followers
*/
router.get(
    "/:id/followers",
    optionalAuthenticate,
    validateUuidParams("id"),
    followers
);

/*
    GET /api/users/:id/following
*/
router.get(
    "/:id/following",
    optionalAuthenticate,
    validateUuidParams("id"),
    following
);

export default router;