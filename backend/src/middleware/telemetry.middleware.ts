import { Request, Response, NextFunction } from "express";

export interface EndpointMetric {
  path: string;
  method: string;
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  lastStatus: number;
}

export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

class TelemetryCollector {
  private totalRequests: number = 0;
  private status2xx: number = 0;
  private status3xx: number = 0;
  private status4xx: number = 0;
  private status5xx: number = 0;
  private totalLatencyMs: number = 0;
  private latencies: number[] = []; // Rolling window for percentiles
  private maxRollingLatencies: number = 500;

  private endpointMetrics: Map<string, EndpointMetric> = new Map();
  private recentRequests: RequestLogEntry[] = [];
  private maxRecentRequests: number = 50;

  private startTime: Date = new Date();

  public recordRequest(req: Request, res: Response, latencyMs: number) {
    this.totalRequests++;
    this.totalLatencyMs += latencyMs;

    // Rolling latency array for p95 calculation
    if (this.latencies.length >= this.maxRollingLatencies) {
      this.latencies.shift();
    }
    this.latencies.push(latencyMs);

    const status = res.statusCode;
    if (status >= 200 && status < 300) {
      this.status2xx++;
    } else if (status >= 300 && status < 400) {
      this.status3xx++;
    } else if (status >= 400 && status < 500) {
      this.status4xx++;
    } else if (status >= 500) {
      this.status5xx++;
    }

    // Normalize path to prevent high-cardinality route explosion (e.g. replace UUIDs with :id)
    const normalizedPath = req.baseUrl + (req.route?.path || req.path);
    const sanitizedPath = normalizedPath
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
      .replace(/\/\d+/g, "/:id");

    const endpointKey = `${req.method.toUpperCase()} ${sanitizedPath}`;
    const existing = this.endpointMetrics.get(endpointKey) || {
      path: sanitizedPath,
      method: req.method.toUpperCase(),
      count: 0,
      errorCount: 0,
      totalLatencyMs: 0,
      avgLatencyMs: 0,
      maxLatencyMs: 0,
      lastStatus: status,
    };

    existing.count++;
    if (status >= 400) existing.errorCount++;
    existing.totalLatencyMs += latencyMs;
    existing.avgLatencyMs = Number((existing.totalLatencyMs / existing.count).toFixed(1));
    existing.maxLatencyMs = Math.max(existing.maxLatencyMs, latencyMs);
    existing.lastStatus = status;
    this.endpointMetrics.set(endpointKey, existing);

    // Recent Request Log
    const logEntry: RequestLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      method: req.method.toUpperCase(),
      path: req.originalUrl || req.url,
      status,
      latencyMs: Number(latencyMs.toFixed(1)),
      timestamp: new Date().toISOString(),
      userAgent: req.get("user-agent") || undefined,
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined,
    };

    if (this.recentRequests.length >= this.maxRecentRequests) {
      this.recentRequests.shift();
    }
    this.recentRequests.push(logEntry);
  }

  public getMetrics() {
    const errorCount = this.status4xx + this.status5xx;
    const errorRatePct = this.totalRequests > 0 ? Number(((errorCount / this.totalRequests) * 100).toFixed(2)) : 0;
    const avgLatencyMs = this.totalRequests > 0 ? Number((this.totalLatencyMs / this.totalRequests).toFixed(1)) : 0;

    // Calculate P95 latency
    let p95LatencyMs = avgLatencyMs;
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      p95LatencyMs = Number((sorted[p95Index] || sorted[sorted.length - 1]).toFixed(1));
    }

    // Top Slow Endpoints
    const slowEndpoints = Array.from(this.endpointMetrics.values())
      .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
      .slice(0, 10);

    const uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    return {
      summary: {
        totalRequests: this.totalRequests,
        errorRatePct,
        status2xx: this.status2xx,
        status3xx: this.status3xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        avgLatencyMs,
        p95LatencyMs,
        uptimeSeconds,
        uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      },
      slowEndpoints,
      recentRequests: [...this.recentRequests].reverse(),
    };
  }

  public reset() {
    this.totalRequests = 0;
    this.status2xx = 0;
    this.status3xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.totalLatencyMs = 0;
    this.latencies = [];
    this.endpointMetrics.clear();
    this.recentRequests = [];
    this.startTime = new Date();
  }
}

export const telemetryCollector = new TelemetryCollector();

export function telemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;
    telemetryCollector.recordRequest(req, res, latencyMs);
  });

  next();
}
