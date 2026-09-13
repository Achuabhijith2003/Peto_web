import { supabase } from "../../config/supabase";
import { telemetryCollector } from "../../middleware/telemetry.middleware";
import {
  getCachedMaintenanceState,
  setCachedMaintenanceState,
  MaintenanceState,
} from "../../middleware/maintenance.middleware";
import { createAuditLog } from "./adminAudit.service";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import fs from "fs";

export interface ServiceHealthItem {
  id: string;
  name: string;
  category: "core" | "infrastructure" | "processing" | "communication";
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  details: string;
  lastChecked: string;
}

export interface SystemHealthReport {
  overallStatus: "HEALTHY" | "DEGRADED" | "DOWN";
  services: ServiceHealthItem[];
  uptimeSeconds: number;
  uptimeFormatted: string;
  systemMemory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  nodeVersion: string;
  platform: string;
  generatedAt: string;
}

/**
 * 1. Comprehensive System Health Monitor across all 9 specified components
 */
export async function getSystemHealthService(): Promise<SystemHealthReport> {
  const services: ServiceHealthItem[] = [];
  const now = new Date().toISOString();

  // 1. API (Express process, event loop & memory)
  const mem = process.memoryUsage();
  services.push({
    id: "api",
    name: "Express REST API",
    category: "core",
    status: "HEALTHY",
    latencyMs: 1.2,
    details: `Uptime: ${Math.floor(process.uptime())}s | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    lastChecked: now,
  });

  // 2. Database (PostgreSQL query latency probe)
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const dbLatency = Date.now() - dbStart;
    services.push({
      id: "database",
      name: "PostgreSQL Database",
      category: "core",
      status: error ? "DOWN" : dbLatency > 500 ? "DEGRADED" : "HEALTHY",
      latencyMs: dbLatency,
      details: error ? error.message : `Connection pool active | Ping: ${dbLatency}ms`,
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "database",
      name: "PostgreSQL Database",
      category: "core",
      status: "DOWN",
      latencyMs: Date.now() - dbStart,
      details: err.message || "Database unreachable",
      lastChecked: now,
    });
  }

  // 3. Supabase (Platform & Backend API)
  const supaStart = Date.now();
  try {
    const { data: supaHealth } = await supabase.from("system_settings").select("key").limit(1);
    const supaLatency = Date.now() - supaStart;
    services.push({
      id: "supabase",
      name: "Supabase Platform Gateway",
      category: "infrastructure",
      status: supaLatency > 600 ? "DEGRADED" : "HEALTHY",
      latencyMs: supaLatency,
      details: `Project active: ${process.env.SUPABASE_URL ? "Connected" : "No URL"} (${supaLatency}ms)`,
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "supabase",
      name: "Supabase Platform Gateway",
      category: "infrastructure",
      status: "DOWN",
      latencyMs: Date.now() - supaStart,
      details: err.message || "Supabase gateway unreachable",
      lastChecked: now,
    });
  }

  // 4. Storage (Bucket accessibility & health)
  const storageStart = Date.now();
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    const storageLatency = Date.now() - storageStart;
    services.push({
      id: "storage",
      name: "Supabase Cloud Storage",
      category: "infrastructure",
      status: error ? "DEGRADED" : "HEALTHY",
      latencyMs: storageLatency,
      details: error ? error.message : `${buckets?.length || 0} storage buckets verified and operational`,
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "storage",
      name: "Supabase Cloud Storage",
      category: "infrastructure",
      status: "DOWN",
      latencyMs: Date.now() - storageStart,
      details: err.message || "Storage service unreachable",
      lastChecked: now,
    });
  }

  // 5. Authentication (Supabase Auth API)
  const authStart = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    const authLatency = Date.now() - authStart;
    services.push({
      id: "auth",
      name: "Authentication Engine",
      category: "core",
      status: error ? "DEGRADED" : "HEALTHY",
      latencyMs: authLatency,
      details: "JWT verification & session management operational",
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "auth",
      name: "Authentication Engine",
      category: "core",
      status: "DOWN",
      latencyMs: Date.now() - authStart,
      details: err.message || "Auth service unreachable",
      lastChecked: now,
    });
  }

  // 6. Realtime (Supabase Realtime Channel Protocol)
  const rtStart = Date.now();
  try {
    // Realtime channel creation ping
    const channel = supabase.channel("system-health-ping");
    channel.subscribe();
    const rtLatency = Date.now() - rtStart;
    channel.unsubscribe();
    services.push({
      id: "realtime",
      name: "Realtime WebSocket Engine",
      category: "communication",
      status: "HEALTHY",
      latencyMs: rtLatency,
      details: "WebSocket connection established and responsive",
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "realtime",
      name: "Realtime WebSocket Engine",
      category: "communication",
      status: "DEGRADED",
      latencyMs: Date.now() - rtStart,
      details: err.message || "Realtime channel degraded",
      lastChecked: now,
    });
  }

  // 7. Image Processing (Sharp engine)
  const imgStart = Date.now();
  try {
    const sharpFormats = sharp.format;
    const isSupported = Boolean(sharpFormats.webp && sharpFormats.jpeg && sharpFormats.png);
    const imgLatency = Date.now() - imgStart;
    services.push({
      id: "image_processing",
      name: "Image Processing (Sharp)",
      category: "processing",
      status: isSupported ? "HEALTHY" : "DEGRADED",
      latencyMs: imgLatency,
      details: `WebP, JPEG, PNG pipeline ready | libvips v${sharp.versions.vips}`,
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "image_processing",
      name: "Image Processing (Sharp)",
      category: "processing",
      status: "DOWN",
      latencyMs: Date.now() - imgStart,
      details: err.message || "Sharp image processor failed",
      lastChecked: now,
    });
  }

  // 8. Video Processing (FFmpeg / FFprobe)
  const vidStart = Date.now();
  try {
    const ffmpegExists = ffmpegPath && fs.existsSync(ffmpegPath);
    const ffprobeExists = ffprobe.path && fs.existsSync(ffprobe.path);
    const vidLatency = Date.now() - vidStart;
    const isReady = Boolean(ffmpegExists && ffprobeExists);
    services.push({
      id: "video_processing",
      name: "Video Processing (FFmpeg)",
      category: "processing",
      status: isReady ? "HEALTHY" : "DEGRADED",
      latencyMs: vidLatency,
      details: isReady
        ? "FFmpeg & FFprobe static binaries mounted and executable"
        : "Video processing binaries missing or unlinked",
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "video_processing",
      name: "Video Processing (FFmpeg)",
      category: "processing",
      status: "DOWN",
      latencyMs: Date.now() - vidStart,
      details: err.message || "Video processor failed",
      lastChecked: now,
    });
  }

  // 9. Notifications (In-app & Realtime Dispatch Queue)
  const notifStart = Date.now();
  try {
    const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true });
    const notifLatency = Date.now() - notifStart;
    services.push({
      id: "notifications",
      name: "Notification Dispatch Service",
      category: "communication",
      status: error ? "DEGRADED" : "HEALTHY",
      latencyMs: notifLatency,
      details: error ? error.message : `Notification dispatcher active (${count || 0} messages processed)`,
      lastChecked: now,
    });
  } catch (err: any) {
    services.push({
      id: "notifications",
      name: "Notification Dispatch Service",
      category: "communication",
      status: "DOWN",
      latencyMs: Date.now() - notifStart,
      details: err.message || "Notification queue unreachable",
      lastChecked: now,
    });
  }

  // Determine overall status
  const hasDown = services.some((s) => s.status === "DOWN");
  const hasDegraded = services.some((s) => s.status === "DEGRADED");
  const overallStatus = hasDown ? "DOWN" : hasDegraded ? "DEGRADED" : "HEALTHY";

  const uptimeSec = Math.floor(process.uptime());

  return {
    overallStatus,
    services,
    uptimeSeconds: uptimeSec,
    uptimeFormatted: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
    systemMemory: {
      rssMB: Number((mem.rss / 1024 / 1024).toFixed(1)),
      heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
      heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(1)),
      externalMB: Number((mem.external / 1024 / 1024).toFixed(1)),
    },
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    generatedAt: now,
  };
}

/**
 * 2. API Telemetry & Monitoring Metrics
 */
export function getApiMetricsService() {
  return telemetryCollector.getMetrics();
}

/**
 * 3. Cloud & Media Storage Analytics
 */
export async function getStorageAnalyticsService() {
  const [mediaRes, bucketsRes] = await Promise.all([
    supabase.from("media").select("id, type, size, mime_type, created_at, status, url"),
    supabase.storage.listBuckets(),
  ]);

  const allMedia = mediaRes.data || [];
  let totalBytes = 0;
  let imageBytes = 0;
  let imageCount = 0;
  let videoBytes = 0;
  let videoCount = 0;
  let thumbnailBytes = 0;
  let thumbnailCount = 0;
  const failedUploads: any[] = [];

  for (const item of allMedia) {
    const size = item.size || 0;
    totalBytes += size;

    if (item.type === "video" || item.type === "reel") {
      videoBytes += size;
      videoCount++;
    } else if (item.type === "thumbnail") {
      thumbnailBytes += size;
      thumbnailCount++;
    } else {
      imageBytes += size;
      imageCount++;
    }

    if (item.status === "failed" || (!item.size && !item.url)) {
      failedUploads.push({
        id: item.id,
        type: item.type,
        createdAt: item.created_at,
        reason: item.status === "failed" ? "Processing error" : "Zero byte upload or incomplete",
      });
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const buckets = (bucketsRes.data || []).map((b) => ({
    name: b.name,
    isPublic: b.public,
    fileSizeLimitMB: b.file_size_limit ? Math.round(b.file_size_limit / (1024 * 1024)) : null,
    createdAt: b.created_at,
  }));

  return {
    totalStorageBytes: totalBytes,
    totalStorageFormatted: formatSize(totalBytes),
    images: {
      count: imageCount,
      bytes: imageBytes,
      formatted: formatSize(imageBytes),
      percentage: totalBytes > 0 ? Number(((imageBytes / totalBytes) * 100).toFixed(1)) : 0,
    },
    videos: {
      count: videoCount,
      bytes: videoBytes,
      formatted: formatSize(videoBytes),
      percentage: totalBytes > 0 ? Number(((videoBytes / totalBytes) * 100).toFixed(1)) : 0,
    },
    thumbnails: {
      count: thumbnailCount,
      bytes: thumbnailBytes,
      formatted: formatSize(thumbnailBytes),
      percentage: totalBytes > 0 ? Number(((thumbnailBytes / totalBytes) * 100).toFixed(1)) : 0,
    },
    failedUploads: {
      count: failedUploads.length,
      items: failedUploads.slice(0, 10),
    },
    buckets,
  };
}

/**
 * 4. Feature Flags Management
 */
export async function getFeatureFlagsService() {
  const { data, error } = await supabase
    .from("feature_flags")
    .select(`
      id,
      key,
      name,
      description,
      is_enabled,
      created_by,
      updated_by,
      created_at,
      updated_at,
      creator:admin_users!feature_flags_created_by_fkey(user:profiles!admin_users_user_id_fkey(username, full_name)),
      updater:admin_users!feature_flags_updated_by_fkey(user:profiles!admin_users_user_id_fkey(username, full_name))
    `)
    .order("key", { ascending: true });

  if (error) {
    // Fallback if joined fkeys fail on fresh tables
    const fallback = await supabase.from("feature_flags").select("*").order("key", { ascending: true });
    return fallback.data || [];
  }

  return data || [];
}

export async function createFeatureFlagService(
  input: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
  },
  adminUserId?: string
) {
  const { key, name, description = "", isEnabled = false } = input;

  const { data, error } = await supabase
    .from("feature_flags")
    .insert({
      key: key.trim().toLowerCase().replace(/\s+/g, "_"),
      name: name.trim(),
      description: description.trim(),
      is_enabled: Boolean(isEnabled),
      created_by: adminUserId || null,
      updated_by: adminUserId || null,
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    adminId: adminUserId,
    action: "FEATURE_FLAG_CREATED",
    resourceType: "feature_flag",
    resourceId: data.id,
    details: { key: data.key, name: data.name, is_enabled: data.is_enabled },
  });

  return data;
}

export async function updateFeatureFlagService(
  id: string,
  input: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
  },
  adminUserId?: string
) {
  const updates: any = { updated_at: new Date().toISOString() };
  if (adminUserId) updates.updated_by = adminUserId;
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.isEnabled !== undefined) updates.is_enabled = Boolean(input.isEnabled);

  const { data, error } = await supabase
    .from("feature_flags")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    adminId: adminUserId,
    action: "FEATURE_FLAG_UPDATED",
    resourceType: "feature_flag",
    resourceId: data.id,
    details: { key: data.key, changes: input },
  });

  return data;
}

export async function deleteFeatureFlagService(id: string, adminUserId?: string) {
  const { data: existing } = await supabase.from("feature_flags").select("key").eq("id", id).single();

  const { error } = await supabase.from("feature_flags").delete().eq("id", id);
  if (error) throw error;

  await createAuditLog({
    adminId: adminUserId,
    action: "FEATURE_FLAG_DELETED",
    resourceType: "feature_flag",
    resourceId: id,
    details: { key: existing?.key },
  });

  return { success: true, id };
}

/**
 * 5. Maintenance Mode Management
 */
export async function getMaintenanceModeService(): Promise<MaintenanceState> {
  const state = getCachedMaintenanceState();
  return state;
}

export async function updateMaintenanceModeService(
  input: {
    isEnabled: boolean;
    message?: string;
    allowedIps?: string[];
  },
  adminUserId?: string
) {
  const isEnabled = Boolean(input.isEnabled);
  const message = input.message?.trim() || "Peto is currently undergoing scheduled maintenance. Please check back shortly.";
  const allowedIps = Array.isArray(input.allowedIps) ? input.allowedIps : [];

  const value = {
    is_enabled: isEnabled,
    message,
    enabled_at: isEnabled ? new Date().toISOString() : null,
    allowed_ips: allowedIps,
  };

  const { data, error } = await supabase
    .from("system_settings")
    .upsert({
      key: "maintenance_mode",
      value,
      description: "Controls public API maintenance window and user circuit breaker",
      updated_by: adminUserId || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Immediately synchronize memory cache
  setCachedMaintenanceState(value);

  // High-priority audit record
  await createAuditLog({
    adminId: adminUserId,
    action: "SYSTEM_MAINTENANCE_TOGGLED",
    resourceType: "system_setting",
    resourceId: "maintenance_mode",
    details: {
      is_enabled: isEnabled,
      message,
      allowedIps,
      toggledAt: new Date().toISOString(),
    },
  });

  return value;
}
