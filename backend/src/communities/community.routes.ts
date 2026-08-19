import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import {
    createCommunity,
    getCommunity,
    updateCommunity,
    deleteCommunity,
    joinCommunity,
    leaveCommunity,
    getMembers,
    updateMemberRole,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    getRules,
    createRule,
    updateRule,
    deleteRule,
    listCommunities,
    getPopularCommunities,
    getSuggestedCommunities,
    getCommunityFeed,
    createReport,
    getReports,
    updateReport,
    banUser,
    unbanUser,
    getBans,
    deleteCommunityPost,
    lockCommunityPost,
} from "./community.controller";

const router = Router();

/*
|--------------------------------------------------------------------------
| Discovery & Suggestions (Placed above /:id to prevent route conflicts)
|--------------------------------------------------------------------------
*/
router.get("/", optionalAuthenticate, listCommunities);
router.get("/popular", optionalAuthenticate, getPopularCommunities);
router.get("/suggestions", authenticate, getSuggestedCommunities);

/*
|--------------------------------------------------------------------------
| Community Management
|--------------------------------------------------------------------------
*/
router.post("/", authenticate, createCommunity);
router.get("/:id", optionalAuthenticate, getCommunity);
router.patch("/:id", authenticate, updateCommunity);
router.delete("/:id", authenticate, deleteCommunity);

/*
|--------------------------------------------------------------------------
| Community Feed
|--------------------------------------------------------------------------
*/
router.get("/:id/posts", optionalAuthenticate, getCommunityFeed);

/*
|--------------------------------------------------------------------------
| Members & Roles
|--------------------------------------------------------------------------
*/
router.post("/:id/join", authenticate, joinCommunity);
router.delete("/:id/membership", authenticate, leaveCommunity);
router.get("/:id/members", optionalAuthenticate, getMembers);
router.patch("/:id/members/:userId/role", authenticate, updateMemberRole);

/*
|--------------------------------------------------------------------------
| Private Join Requests
|--------------------------------------------------------------------------
*/
router.get("/:id/requests", authenticate, getJoinRequests);
router.post("/:id/requests/:requestId/approve", authenticate, approveJoinRequest);
router.post("/:id/requests/:requestId/reject", authenticate, rejectJoinRequest);

/*
|--------------------------------------------------------------------------
| Rules
|--------------------------------------------------------------------------
*/
router.get("/:id/rules", optionalAuthenticate, getRules);
router.post("/:id/rules", authenticate, createRule);
router.patch("/:id/rules/:ruleId", authenticate, updateRule);
router.delete("/:id/rules/:ruleId", authenticate, deleteRule);

/*
|--------------------------------------------------------------------------
| Moderation, Reports & Bans
|--------------------------------------------------------------------------
*/
router.post("/:id/reports", authenticate, createReport);
router.get("/:id/reports", authenticate, getReports);
router.patch("/:id/reports/:reportId", authenticate, updateReport);

router.post("/:id/bans", authenticate, banUser);
router.get("/:id/bans", authenticate, getBans);
router.delete("/:id/bans/:userId", authenticate, unbanUser);

/*
|--------------------------------------------------------------------------
| Post Moderation inside Community
|--------------------------------------------------------------------------
*/
router.delete("/:communityId/posts/:postId", authenticate, deleteCommunityPost);
router.post("/:communityId/posts/:postId/lock", authenticate, lockCommunityPost);

export default router;
