import React, { useEffect, useState, useCallback } from "react";
import {
  Server,
  Activity,
  HardDrive,
  Flag,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Cpu,
  Database,
  Radio,
  Image as ImageIcon,
  Video,
  Bell,
  Lock,
} from "lucide-react";
import {
  fetchSystemHealth,
  fetchApiMetrics,
  fetchStorageMetrics,
  fetchFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  fetchMaintenanceMode,
  updateMaintenanceMode,
} from "../api/adminApi";
import {
  SystemHealthReport,
  ApiTelemetryMetrics,
  StorageAnalyticsData,
  FeatureFlagItem,
  MaintenanceModeState,
} from "../types/admin";

type SystemTab = "health" | "telemetry" | "storage" | "flags";

export const AdminSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SystemTab>("health");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [healthData, setHealthData] = useState<SystemHealthReport | null>(null);
  const [telemetryData, setTelemetryData] = useState<ApiTelemetryMetrics | null>(null);
  const [storageData, setStorageData] = useState<StorageAnalyticsData | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceModeState | null>(null);

  // Feature Flag Modal
  const [showAddFlagModal, setShowAddFlagModal] = useState<boolean>(false);
  const [newFlagKey, setNewFlagKey] = useState<string>("");
  const [newFlagName, setNewFlagName] = useState<string>("");
  const [newFlagDesc, setNewFlagDesc] = useState<string>("");
  const [newFlagEnabled, setNewFlagEnabled] = useState<boolean>(false);
  const [isSubmittingFlag, setIsSubmittingFlag] = useState<boolean>(false);

  // Maintenance Edit State
  const [maintenanceMsgInput, setMaintenanceMsgInput] = useState<string>("");
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState<boolean>(false);
  const [showConfirmMaintenanceModal, setShowConfirmMaintenanceModal] = useState<boolean>(false);
  const [targetMaintenanceState, setTargetMaintenanceState] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case "health": {
          const res = await fetchSystemHealth();
          setHealthData(res);
          break;
        }
        case "telemetry": {
          const res = await fetchApiMetrics();
          setTelemetryData(res);
          break;
        }
        case "storage": {
          const res = await fetchStorageMetrics();
          setStorageData(res);
          break;
        }
        case "flags": {
          const [flagsRes, maintRes] = await Promise.all([
            fetchFeatureFlags(),
            fetchMaintenanceMode(),
          ]);
          setFeatureFlags(flagsRes);
          setMaintenanceMode(maintRes);
          setMaintenanceMsgInput(maintRes.message);
          break;
        }
      }
    } catch (err: any) {
      console.error("Failed to load system data:", err);
      setError(err.response?.data?.message || err.message || "Failed to load system diagnostics.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Feature Flag Toggle
  const handleToggleFlag = async (flag: FeatureFlagItem) => {
    try {
      const updated = await updateFeatureFlag(flag.id, {
        isEnabled: !flag.is_enabled,
      });
      setFeatureFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: updated.is_enabled, updated_at: updated.updated_at } : f))
      );
    } catch (err: any) {
      alert("Failed to toggle feature flag: " + (err.message || "Unknown error"));
    }
  };

  // Handle Delete Feature Flag
  const handleDeleteFlag = async (id: string, key: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete feature flag '${key}'?`)) {
      return;
    }
    try {
      await deleteFeatureFlag(id);
      setFeatureFlags((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert("Failed to delete feature flag: " + (err.message || "Unknown error"));
    }
  };

  // Handle Create Feature Flag
  const handleCreateFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagKey.trim() || !newFlagName.trim()) return;

    setIsSubmittingFlag(true);
    try {
      const created = await createFeatureFlag({
        key: newFlagKey.trim(),
        name: newFlagName.trim(),
        description: newFlagDesc.trim(),
        isEnabled: newFlagEnabled,
      });
      setFeatureFlags((prev) => [...prev, created]);
      setShowAddFlagModal(false);
      setNewFlagKey("");
      setNewFlagName("");
      setNewFlagDesc("");
      setNewFlagEnabled(false);
    } catch (err: any) {
      alert("Failed to create feature flag: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  // Handle Maintenance Mode Toggle Execution
  const executeMaintenanceToggle = async () => {
    setIsUpdatingMaintenance(true);
    try {
      const updated = await updateMaintenanceMode({
        isEnabled: targetMaintenanceState,
        message: maintenanceMsgInput.trim(),
      });
      setMaintenanceMode(updated);
      setShowConfirmMaintenanceModal(false);
    } catch (err: any) {
      alert("Failed to update maintenance mode: " + (err.response?.data?.message || err.message));
    } finally {
      setIsUpdatingMaintenance(false);
    }
  };

  const tabs: Array<{ id: SystemTab; label: string; icon: any }> = [
    { id: "health", label: "System Health & Services", icon: Server },
    { id: "telemetry", label: "API & Telemetry Monitoring", icon: Activity },
    { id: "storage", label: "Cloud & Media Storage", icon: HardDrive },
    { id: "flags", label: "Feature Flags & Maintenance", icon: Flag },
  ];

  const getServiceIcon = (id: string) => {
    switch (id) {
      case "api":
        return Cpu;
      case "database":
        return Database;
      case "supabase":
        return Server;
      case "storage":
        return HardDrive;
      case "auth":
        return Lock;
      case "realtime":
        return Radio;
      case "image_processing":
        return ImageIcon;
      case "video_processing":
        return Video;
      case "notifications":
        return Bell;
      default:
        return Server;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                System Management & Infrastructure
                {healthData && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                      healthData.overallStatus === "HEALTHY"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : healthData.overallStatus === "DEGRADED"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    System {healthData.overallStatus}
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-400">
                End-to-end service monitoring, live request telemetry, cloud storage analytics, and feature flags.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/60 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            Run Diagnostics
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Checking infrastructure nodes...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: SYSTEM HEALTH & 9 MONITORED SERVICES */}
          {activeTab === "health" && healthData && (
            <div className="space-y-6">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Platform Uptime</span>
                  <p className="text-2xl font-bold text-white mt-1">{healthData.uptimeFormatted}</p>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High availability
                  </p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Memory (RSS / Heap)</span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {healthData.systemMemory.heapUsedMB} MB
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    RSS: {healthData.systemMemory.rssMB} MB • Heap Total: {healthData.systemMemory.heapTotalMB} MB
                  </p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Environment & Node</span>
                  <p className="text-2xl font-bold text-white mt-1">{healthData.nodeVersion}</p>
                  <p className="text-xs text-slate-400 mt-1">{healthData.platform}</p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Monitored Services</span>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {healthData.services.filter((s) => s.status === "HEALTHY").length} / {healthData.services.length} Healthy
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Real-time latency validated</p>
                </div>
              </div>

              {/* 9 Services Health Grid */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Core Subsystems & Infrastructure Grid (9 Components)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {healthData.services.map((svc) => {
                    const SvcIcon = getServiceIcon(svc.id);
                    return (
                      <div
                        key={svc.id}
                        className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-slate-600 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-slate-700/40 text-slate-200">
                                <SvcIcon className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white">{svc.name}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                                  {svc.category}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                svc.status === "HEALTHY"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : svc.status === "DEGRADED"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {svc.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-3 font-mono break-all">{svc.details}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {svc.latencyMs} ms latency
                          </span>
                          <span>Checked: Just now</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API & TELEMETRY MONITORING */}
          {activeTab === "telemetry" && telemetryData && (
            <div className="space-y-6">
              {/* Telemetry Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Total API Requests</span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {telemetryData.summary.totalRequests.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Monitored Express traffic</p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Live Error Rate</span>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      telemetryData.summary.errorRatePct > 5 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {telemetryData.summary.errorRatePct}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">4xx & 5xx HTTP response share</p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Average Response Time</span>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {telemetryData.summary.avgLatencyMs} ms
                  </p>
                  <p className="text-xs text-slate-400 mt-1">P95 Latency: {telemetryData.summary.p95LatencyMs} ms</p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Status Codes Distribution</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                      2xx: {telemetryData.summary.status2xx}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                      4xx: {telemetryData.summary.status4xx}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono">
                      5xx: {telemetryData.summary.status5xx}
                    </span>
                  </div>
                </div>
              </div>

              {/* Slow Endpoints Table */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Top Slow Endpoints (Ranked by Latency)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Endpoint Path</th>
                        <th className="py-3 px-4 text-right">Calls</th>
                        <th className="py-3 px-4 text-right">Avg Latency</th>
                        <th className="py-3 px-4 text-right">Max Latency</th>
                        <th className="py-3 px-4 text-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {telemetryData.slowEndpoints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                            No telemetry recorded yet. Make API requests to populate data.
                          </td>
                        </tr>
                      ) : (
                        telemetryData.slowEndpoints.map((ep) => (
                          <tr key={`${ep.method}-${ep.path}`} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-bold text-cyan-400">{ep.method}</td>
                            <td className="py-3 px-4 text-slate-200 font-medium">{ep.path}</td>
                            <td className="py-3 px-4 text-right text-slate-300">{ep.count}</td>
                            <td className="py-3 px-4 text-right font-bold text-amber-400">
                              {ep.avgLatencyMs} ms
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400">{ep.maxLatencyMs} ms</td>
                            <td className="py-3 px-4 text-right font-semibold text-rose-400">
                              {ep.errorCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Requests Stream */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Live Recent Request Stream (Last 50)
                </h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-2.5 px-4">Method</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">URL</th>
                        <th className="py-2.5 px-4 text-right">Duration</th>
                        <th className="py-2.5 px-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {telemetryData.recentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-4 font-bold text-slate-300">{req.method}</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                req.status < 400
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : req.status < 500
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-slate-300 max-w-sm truncate">{req.path}</td>
                          <td className="py-2 px-4 text-right text-cyan-400 font-semibold">{req.latencyMs} ms</td>
                          <td className="py-2 px-4 text-right text-slate-500 text-[11px]">
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUD & MEDIA STORAGE ANALYTICS */}
          {activeTab === "storage" && storageData && (
            <div className="space-y-6">
              {/* Storage Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Total Media Storage</span>
                  <p className="text-2xl font-bold text-white mt-1">{storageData.totalStorageFormatted}</p>
                  <p className="text-xs text-slate-400 mt-1">Across all Supabase buckets</p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Images Storage</span>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">{storageData.images.formatted}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {storageData.images.count.toLocaleString()} files ({storageData.images.percentage}%)
                  </p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Videos & Reels</span>
                  <p className="text-2xl font-bold text-violet-400 mt-1">{storageData.videos.formatted}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {storageData.videos.count.toLocaleString()} files ({storageData.videos.percentage}%)
                  </p>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Thumbnails Storage</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{storageData.thumbnails.formatted}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {storageData.thumbnails.count.toLocaleString()} files ({storageData.thumbnails.percentage}%)
                  </p>
                </div>
              </div>

              {/* Buckets Breakdown & Failed Uploads */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Buckets List */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    Storage Buckets Configuration
                  </h3>
                  <div className="space-y-3">
                    {storageData.buckets.map((b) => (
                      <div
                        key={b.name}
                        className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white font-mono">{b.name}</p>
                          <p className="text-xs text-slate-400">
                            Max file limit: {b.fileSizeLimitMB ? `${b.fileSizeLimitMB} MB` : "Unlimited"}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            b.isPublic
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {b.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed Uploads Audit */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Failed & Incomplete Uploads
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {storageData.failedUploads.count} Failed
                    </span>
                  </div>

                  {storageData.failedUploads.items.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                      No failed or corrupted uploads found in storage pipeline.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {storageData.failedUploads.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-mono text-slate-200">ID: {item.id.slice(0, 13)}...</p>
                            <p className="text-[11px] text-rose-400">{item.reason}</p>
                          </div>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE FLAGS & MAINTENANCE MODE */}
          {activeTab === "flags" && (
            <div className="space-y-6">
              {/* Controlled Maintenance Mode Emergency Box */}
              {maintenanceMode && (
                <div
                  className={`p-6 rounded-2xl border transition-all ${
                    maintenanceMode.is_enabled
                      ? "bg-rose-950/40 border-rose-500/60 shadow-xl shadow-rose-950/50"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            maintenanceMode.is_enabled ? "text-rose-400 animate-pulse" : "text-amber-400"
                          }`}
                        />
                        <h3 className="text-base font-bold text-white">Controlled Maintenance Mode</h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            maintenanceMode.is_enabled
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {maintenanceMode.is_enabled ? "MAINTENANCE ACTIVE" : "SYSTEM LIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        When enabled, all client user traffic receives HTTP 503 while administrative routes remain operational.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setTargetMaintenanceState(!maintenanceMode.is_enabled);
                        setShowConfirmMaintenanceModal(true);
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                        maintenanceMode.is_enabled
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                          : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                      }`}
                    >
                      {maintenanceMode.is_enabled ? "Deactivate Maintenance" : "Activate Maintenance"}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Client-Facing Downtime Message:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={maintenanceMsgInput}
                        onChange={(e) => setMaintenanceMsgInput(e.target.value)}
                        placeholder="e.g. Peto is currently undergoing scheduled maintenance. Please check back shortly."
                        className="flex-1 bg-slate-800/80 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={async () => {
                          try {
                            const updated = await updateMaintenanceMode({
                              isEnabled: maintenanceMode.is_enabled,
                              message: maintenanceMsgInput,
                            });
                            setMaintenanceMode(updated);
                            alert("Maintenance message updated successfully.");
                          } catch (err: any) {
                            alert("Failed to update message: " + err.message);
                          }
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                      >
                        Save Message
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Flags Management */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Flag className="w-4 h-4 text-cyan-400" />
                      Dynamic Feature Flags Catalog
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Toggle operational features in real time without redeploying code.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddFlagModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    New Feature Flag
                  </button>
                </div>

                {/* Flags Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Feature Flag / Key</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Last Updated</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {featureFlags.map((flag) => (
                        <tr key={flag.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{flag.name}</p>
                            <p className="text-[11px] font-mono text-cyan-400 mt-0.5">{flag.key}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs">{flag.description || "—"}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleFlag(flag)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
                                flag.is_enabled
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                              }`}
                            >
                              {flag.is_enabled ? "ENABLED" : "DISABLED"}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(flag.updated_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteFlag(flag.id, flag.key)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete feature flag"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD FEATURE FLAG */}
      {showAddFlagModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-cyan-400" />
              Create New Feature Flag
            </h3>

            <form onSubmit={handleCreateFlagSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Flag Key (Unique Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ai_moderation_enabled"
                  value={newFlagKey}
                  onChange={(e) => setNewFlagKey(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Content Moderation"
                  value={newFlagName}
                  onChange={(e) => setNewFlagName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What does this feature flag toggle?"
                  value={newFlagDesc}
                  onChange={(e) => setNewFlagDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="flagEnabledChk"
                  checked={newFlagEnabled}
                  onChange={(e) => setNewFlagEnabled(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="flagEnabledChk" className="text-slate-300 font-medium cursor-pointer">
                  Enable immediately upon creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddFlagModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFlag}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-50"
                >
                  {isSubmittingFlag ? "Creating..." : "Create Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM MAINTENANCE MODE TOGGLE */}
      {showConfirmMaintenanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  targetMaintenanceState ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {targetMaintenanceState ? "Activate Maintenance Mode?" : "Deactivate Maintenance Mode?"}
                </h3>
                <p className="text-xs text-slate-400">Confirmation required for global platform state change.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {targetMaintenanceState
                ? "WARNING: Enabling maintenance mode will block all mobile and web user requests with HTTP 503. Only authorized administrators will be allowed to use the application."
                : "Disabling maintenance mode will restore standard public traffic and re-open all feeds, APIs, and client operations."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmMaintenanceModal(false)}
                disabled={isUpdatingMaintenance}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executeMaintenanceToggle}
                disabled={isUpdatingMaintenance}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition disabled:opacity-50 ${
                  targetMaintenanceState ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {isUpdatingMaintenance
                  ? "Processing..."
                  : targetMaintenanceState
                  ? "Confirm & Activate"
                  : "Confirm & Restore Live"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystem;
