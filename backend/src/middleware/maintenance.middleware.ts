import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export interface MaintenanceState {
  is_enabled: boolean;
  message: string;
  enabled_at: string | null;
  allowed_ips: string[];
}

let cachedState: MaintenanceState = {
  is_enabled: false,
  message: "Peto is currently undergoing scheduled maintenance. Please check back shortly.",
  enabled_at: null,
  allowed_ips: [],
};

let lastFetchTime = 0;
const CACHE_TTL_MS = 15_000; // 15s refresh interval

export function setCachedMaintenanceState(newState: Partial<MaintenanceState>) {
  cachedState = { ...cachedState, ...newState };
  lastFetchTime = Date.now();
}

export function getCachedMaintenanceState(): MaintenanceState {
  return cachedState;
}

export async function refreshMaintenanceState(): Promise<MaintenanceState> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (!error && data?.value) {
      cachedState = {
        is_enabled: Boolean(data.value.is_enabled),
        message: data.value.message || cachedState.message,
        enabled_at: data.value.enabled_at || null,
        allowed_ips: Array.isArray(data.value.allowed_ips) ? data.value.allowed_ips : [],
      };
      lastFetchTime = Date.now();
    }
  } catch (err) {
    // Non-fatal, fallback to current memory state
  }

  return cachedState;
}

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Always allow health checks and admin API control panel
  if (
    req.path === "/health" ||
    req.originalUrl.startsWith("/health") ||
    req.originalUrl.startsWith("/api/admin")
  ) {
    return next();
  }

  // Refresh cache periodically if needed
  if (Date.now() - lastFetchTime > CACHE_TTL_MS) {
    refreshMaintenanceState().catch(() => {});
  }

  // If maintenance mode is active, reject general user traffic
  if (cachedState.is_enabled) {
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
    if (cachedState.allowed_ips.includes(clientIp)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      maintenance: true,
      message: cachedState.message,
      timestamp: new Date().toISOString(),
    });
  }

  return next();
}
