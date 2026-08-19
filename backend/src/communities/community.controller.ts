import { Request, Response } from "express";
import {
    createCommunitySchema,
    updateCommunitySchema,
    createRuleSchema,
    updateRuleSchema,
    createReportSchema,
    updateReportSchema,
    createBanSchema,
    updateMemberRoleSchema,
} from "./community.validation";
import {
    createCommunityService,
    getCommunityByIdService,
    updateCommunityService,
    deleteCommunityService,
    joinCommunityService,
    leaveCommunityService,
    getCommunityMembersService,
    updateMemberRoleService,
    getPendingJoinRequestsService,
    handleJoinRequestService,
    getCommunityRulesService,
    createCommunityRuleService,
    updateCommunityRuleService,
    deleteCommunityRuleService,
    queryCommunitiesService,
    getPopularCommunitiesService,
    getSuggestedCommunitiesService,
    createCommunityReportService,
    getCommunityReportsService,
    updateCommunityReportService,
    banUserFromCommunityService,
    unbanUserFromCommunityService,
    getCommunityBansService,
    moderatePostService,
} from "./community.service";
import { getCommunityFeedService } from "../posts/post.service";

/*
|--------------------------------------------------------------------------
| Community CRUD Controllers
|--------------------------------------------------------------------------
*/

export async function createCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = createCommunitySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await createCommunityService(userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (err: any) {
        console.error("createCommunity error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to create community." });
    }
}

export async function getCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;

        const data = await getCommunityByIdService(id, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getCommunity error:", err);
        return res.status(404).json({ success: false, message: err.message || "Community not found." });
    }
}

export async function updateCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = updateCommunitySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await updateCommunityService(id, userId, parsed.data);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("updateCommunity error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to update community." });
    }
}

export async function deleteCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await deleteCommunityService(id, userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("deleteCommunity error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to delete community." });
    }
}

/*
|--------------------------------------------------------------------------
| Membership Controllers
|--------------------------------------------------------------------------
*/

export async function joinCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await joinCommunityService(id, userId);
        return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        console.error("joinCommunity error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to join community." });
    }
}

export async function leaveCommunity(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await leaveCommunityService(id, userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("leaveCommunity error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to leave community." });
    }
}

export async function getMembers(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const data = await getCommunityMembersService(id, userId, page, limit);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getMembers error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to fetch members." });
    }
}

export async function updateMemberRole(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        const targetUserId = req.params.userId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = updateMemberRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await updateMemberRoleService(communityId, targetUserId, parsed.data.role, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("updateMemberRole error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to update role." });
    }
}

/*
|--------------------------------------------------------------------------
| Join Requests
|--------------------------------------------------------------------------
*/

export async function getJoinRequests(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const data = await getPendingJoinRequestsService(id, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getJoinRequests error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to get requests." });
    }
}

export async function approveJoinRequest(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const requestId = req.params.requestId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await handleJoinRequestService(id, requestId, "approve", userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("approveJoinRequest error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to approve request." });
    }
}

export async function rejectJoinRequest(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const requestId = req.params.requestId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await handleJoinRequestService(id, requestId, "reject", userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("rejectJoinRequest error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to reject request." });
    }
}

/*
|--------------------------------------------------------------------------
| Rules Controllers
|--------------------------------------------------------------------------
*/

export async function getRules(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const data = await getCommunityRulesService(id);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getRules error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to fetch rules." });
    }
}

export async function createRule(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = createRuleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await createCommunityRuleService(id, userId, parsed.data);
        return res.status(201).json({ success: true, data });
    } catch (err: any) {
        console.error("createRule error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to create rule." });
    }
}

export async function updateRule(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const ruleId = req.params.ruleId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = updateRuleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await updateCommunityRuleService(id, ruleId, userId, parsed.data);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("updateRule error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to update rule." });
    }
}

export async function deleteRule(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const ruleId = req.params.ruleId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await deleteCommunityRuleService(id, ruleId, userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("deleteRule error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to delete rule." });
    }
}

/*
|--------------------------------------------------------------------------
| Discovery & Suggestions
|--------------------------------------------------------------------------
*/

export async function listCommunities(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const { search, category, visibility, sort, page, limit } = req.query;

        const data = await queryCommunitiesService({
            search: search as string,
            category: category as string,
            visibility: visibility as any,
            sort: sort as any,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
            userId,
        });

        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("listCommunities error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to list communities." });
    }
}

export async function getPopularCommunities(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;

        const data = await getPopularCommunitiesService(limit, userId);
        return res.status(200).json({ success: true, data: data.communities });
    } catch (err: any) {
        console.error("getPopularCommunities error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to get popular communities." });
    }
}

export async function getSuggestedCommunities(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(200).json({ success: true, data: [] });

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
        const data = await getSuggestedCommunitiesService(userId, limit);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getSuggestedCommunities error:", err);
        return res.status(500).json({ success: false, message: err.message || "Failed to get suggestions." });
    }
}

/*
|--------------------------------------------------------------------------
| Community Feed
|--------------------------------------------------------------------------
*/

export async function getCommunityFeed(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as "new" | "popular") || "new";

        const data = await getCommunityFeedService(communityId, userId, page, limit, sort);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getCommunityFeed error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to fetch community feed." });
    }
}

/*
|--------------------------------------------------------------------------
| Moderation, Reports & Bans
|--------------------------------------------------------------------------
*/

export async function createReport(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = createReportSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await createCommunityReportService(communityId, userId, parsed.data);
        return res.status(201).json({ success: true, data, message: "Report submitted to community moderators." });
    } catch (err: any) {
        console.error("createReport error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to create report." });
    }
}

export async function getReports(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const data = await getCommunityReportsService(communityId, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getReports error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to get reports." });
    }
}

export async function updateReport(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const reportId = req.params.reportId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = updateReportSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await updateCommunityReportService(id, reportId, parsed.data.status, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("updateReport error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to update report." });
    }
}

export async function banUser(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const parsed = createBanSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }

        const data = await banUserFromCommunityService(
            communityId,
            parsed.data.user_id,
            parsed.data.reason,
            parsed.data.expires_at,
            userId
        );
        return res.status(200).json({ success: true, data, message: "User banned from community." });
    } catch (err: any) {
        console.error("banUser error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to ban user." });
    }
}

export async function unbanUser(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;
        const targetUserId = req.params.userId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await unbanUserFromCommunityService(id, targetUserId, userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("unbanUser error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to unban user." });
    }
}

export async function getBans(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.id as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const data = await getCommunityBansService(communityId, userId);
        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error("getBans error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to get bans." });
    }
}

export async function deleteCommunityPost(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.communityId as string;
        const postId = req.params.postId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await moderatePostService(communityId, postId, "delete", userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("deleteCommunityPost error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to delete post." });
    }
}

export async function lockCommunityPost(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const communityId = req.params.communityId as string;
        const postId = req.params.postId as string;
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

        const result = await moderatePostService(communityId, postId, "lock", userId);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error("lockCommunityPost error:", err);
        return res.status(400).json({ success: false, message: err.message || "Failed to lock/unlock post." });
    }
}
