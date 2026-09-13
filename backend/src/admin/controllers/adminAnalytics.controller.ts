import { Request, Response } from "express";
import {
  getAnalyticsOverviewService,
  getUserAnalyticsService,
  getEngagementAnalyticsService,
  getContentAnalyticsService,
  getReelsAnalyticsService,
  getCommunitiesAnalyticsService,
  getRetentionAnalyticsService,
  getRevenueAnalyticsService,
  trackAnalyticsEventService,
} from "../services/adminAnalytics.service";
import { convertToCSV, formatFilename } from "../services/adminExport.service";

/**
 * Helper to extract range parameters
 */
function extractParams(req: Request) {
  return {
    range: req.query.range as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };
}

export async function getOverview(req: Request, res: Response) {
  try {
    const data = await getAnalyticsOverviewService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve overview analytics." });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const data = await getUserAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve user analytics." });
  }
}

export async function getEngagement(req: Request, res: Response) {
  try {
    const data = await getEngagementAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve engagement analytics." });
  }
}

export async function getContent(req: Request, res: Response) {
  try {
    const data = await getContentAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve content analytics." });
  }
}

export async function getReels(req: Request, res: Response) {
  try {
    const data = await getReelsAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve reels analytics." });
  }
}

export async function getCommunities(req: Request, res: Response) {
  try {
    const data = await getCommunitiesAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve communities analytics." });
  }
}

export async function getRetention(req: Request, res: Response) {
  try {
    const data = await getRetentionAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve retention analytics." });
  }
}

export async function getRevenue(req: Request, res: Response) {
  try {
    const data = await getRevenueAnalyticsService(extractParams(req));
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve revenue analytics." });
  }
}

/**
 * GET /api/admin/analytics/export?section=users&format=csv
 * Modular export controller
 */
export async function exportAnalytics(req: Request, res: Response) {
  try {
    const section = (req.query.section as string) || "overview";
    const format = (req.query.format as string) || "csv";
    const params = extractParams(req);

    let rawData: any;
    switch (section) {
      case "users":
        rawData = await getUserAnalyticsService(params);
        break;
      case "engagement":
        rawData = await getEngagementAnalyticsService(params);
        break;
      case "content":
        rawData = await getContentAnalyticsService(params);
        break;
      case "reels":
        rawData = await getReelsAnalyticsService(params);
        break;
      case "communities":
        rawData = await getCommunitiesAnalyticsService(params);
        break;
      case "retention":
        rawData = await getRetentionAnalyticsService(params);
        break;
      case "revenue":
        rawData = await getRevenueAnalyticsService(params);
        break;
      default:
        rawData = await getAnalyticsOverviewService(params);
        break;
    }

    // Flatten for tabular export
    let exportRows: any[] = [];
    if (section === "retention" && rawData.cohorts) {
      exportRows = rawData.cohorts;
    } else if (section === "content" && rawData.topCreators) {
      exportRows = rawData.topCreators.map((c: any) => ({
        username: c.author?.username,
        fullName: c.author?.full_name,
        postCount: c.postCount,
        totalLikes: c.totalLikes,
      }));
    } else if (section === "reels" && rawData.topReels) {
      exportRows = rawData.topReels.map((r: any) => ({
        postId: r.postId,
        author: r.author?.username,
        caption: r.caption,
        views: r.views,
        likes: r.likes,
        avgWatchSeconds: r.avgWatchSeconds,
      }));
    } else if (section === "communities" && rawData.topCommunities) {
      exportRows = rawData.topCommunities.map((c: any) => ({
        name: c.name,
        slug: c.slug,
        membersCount: c.membersCount,
        owner: c.owner?.username,
        createdAt: c.created_at,
      }));
    } else if (section === "users" && rawData.geoDistribution) {
      exportRows = rawData.geoDistribution;
    } else {
      // Flatten key-value metrics
      const flat: Record<string, any> = {};
      const src = rawData.summary || rawData.metrics || rawData;
      for (const [k, v] of Object.entries(src)) {
        if (typeof v !== "object") flat[k] = v;
      }
      exportRows = [flat];
    }

    const csvContent = convertToCSV(exportRows);
    const filename = formatFilename(section, format);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error("[exportAnalytics Error]:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to export analytics data." });
  }
}

/**
 * POST /api/admin/analytics/track
 * Ingestion endpoint
 */
export async function trackEvent(req: Request, res: Response) {
  try {
    const { eventName, userId, targetType, targetId, properties } = req.body;
    if (!eventName) {
      return res.status(400).json({ success: false, message: "eventName is required." });
    }

    const result = await trackAnalyticsEventService({
      eventName,
      userId,
      targetType,
      targetId,
      properties,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to track event." });
  }
}
