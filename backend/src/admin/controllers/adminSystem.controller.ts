import { Request, Response } from "express";
import {
  getSystemHealthService,
  getApiMetricsService,
  getStorageAnalyticsService,
  getFeatureFlagsService,
  createFeatureFlagService,
  updateFeatureFlagService,
  deleteFeatureFlagService,
  getMaintenanceModeService,
  updateMaintenanceModeService,
} from "../services/adminSystem.service";

export async function getSystemHealth(req: Request, res: Response) {
  try {
    const data = await getSystemHealthService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve system health." });
  }
}

export async function getApiMetrics(req: Request, res: Response) {
  try {
    const data = getApiMetricsService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve API metrics." });
  }
}

export async function getStorageAnalytics(req: Request, res: Response) {
  try {
    const data = await getStorageAnalyticsService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve storage analytics." });
  }
}

export async function getFeatureFlags(req: Request, res: Response) {
  try {
    const data = await getFeatureFlagsService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve feature flags." });
  }
}

export async function createFeatureFlag(req: Request, res: Response) {
  try {
    const { key, name, description, isEnabled } = req.body;
    if (!key || !name) {
      return res.status(400).json({ success: false, message: "key and name are required." });
    }

    const adminId = (req as any).adminUser?.adminId;
    const data = await createFeatureFlagService({ key, name, description, isEnabled }, adminId);
    return res.status(201).json({ success: true, data, message: `Feature flag '${data.key}' created.` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create feature flag." });
  }
}

export async function updateFeatureFlag(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { name, description, isEnabled } = req.body;
    const adminId = (req as any).adminUser?.adminId;

    const data = await updateFeatureFlagService(id, { name, description, isEnabled }, adminId);
    return res.status(200).json({ success: true, data, message: `Feature flag '${data.key}' updated.` });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update feature flag." });
  }
}

export async function deleteFeatureFlag(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const adminId = (req as any).adminUser?.adminId;

    const result = await deleteFeatureFlagService(id, adminId);
    return res.status(200).json({ success: true, data: result, message: "Feature flag removed." });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to delete feature flag." });
  }
}

export async function getMaintenanceMode(req: Request, res: Response) {
  try {
    const data = await getMaintenanceModeService();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to retrieve maintenance mode state." });
  }
}

export async function updateMaintenanceMode(req: Request, res: Response) {
  try {
    const { isEnabled, message, allowedIps } = req.body;
    if (isEnabled === undefined) {
      return res.status(400).json({ success: false, message: "isEnabled boolean is required." });
    }

    const adminId = (req as any).adminUser?.adminId;
    const data = await updateMaintenanceModeService({ isEnabled, message, allowedIps }, adminId);

    return res.status(200).json({
      success: true,
      data,
      message: isEnabled ? "Maintenance mode ACTIVATED." : "Maintenance mode DEACTIVATED.",
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update maintenance mode." });
  }
}
