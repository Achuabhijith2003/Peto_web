import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  CreditCard,
  Megaphone,
} from "lucide-react";
import { fetchAdminRegions, updateAdminRegion } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

export const AdminRegions: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission("system.manage");

  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadRegions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminRegions();
      if (res.success) {
        setRegions(res.regions || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const handleToggle = async (code: string, field: string, currentValue: boolean) => {
    if (!canManage) return;
    try {
      const res = await updateAdminRegion(code, { [field]: !currentValue });
      if (res.success) {
        setRegions((prev) =>
          prev.map((r) => (r.code === code ? { ...r, [field]: !currentValue } : r))
        );
        setFeedback({
          type: "success",
          message: `Updated ${code.toUpperCase()} ${field} to ${!currentValue ? "ENABLED" : "DISABLED"}.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || err.message || "Failed to update regional rule.",
      });
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegion || !canManage) return;

    setSaving(true);
    try {
      const res = await updateAdminRegion(selectedRegion.code, {
        ads_enabled: selectedRegion.ads_enabled,
        payments_enabled: selectedRegion.payments_enabled,
        advertiser_registration_enabled: selectedRegion.advertiser_registration_enabled,
        default_currency: selectedRegion.default_currency,
        default_payment_provider: selectedRegion.default_payment_provider,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Configuration for ${selectedRegion.name} saved successfully.`,
        });
        setSelectedRegion(null);
        loadRegions();
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || err.message || "Failed to update regional settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = regions.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.continent && r.continent.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regional Control Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Global Compliance
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure country-specific monetization rules, advertising availability, and payment gateway routing.
          </p>
        </div>

        <button
          onClick={loadRegions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:opacity-75 uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <input
          type="text"
          placeholder="Search country or currency (e.g. India, US, EUR)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <span className="text-xs text-slate-400 font-medium">
          {filtered.length} regions configured
        </span>
      </div>

      {/* Regions Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Region / Country</th>
                <th className="px-5 py-3.5">Ads Enabled</th>
                <th className="px-5 py-3.5">Payments</th>
                <th className="px-5 py-3.5">Advertiser Reg</th>
                <th className="px-5 py-3.5">Default Currency</th>
                <th className="px-5 py-3.5">Primary Gateway</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((region) => (
                <tr key={region.code} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-xs text-slate-700 border border-slate-200">
                        {region.code}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{region.name}</div>
                        <div className="text-[11px] text-slate-400">{region.continent || "GLOBAL"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggle(region.code, "ads_enabled", region.ads_enabled)}
                      disabled={!canManage}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                        region.ads_enabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      <Megaphone className="w-3 h-3" />
                      {region.ads_enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggle(region.code, "payments_enabled", region.payments_enabled)}
                      disabled={!canManage}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                        region.payments_enabled
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      <CreditCard className="w-3 h-3" />
                      {region.payments_enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() =>
                        handleToggle(
                          region.code,
                          "advertiser_registration_enabled",
                          region.advertiser_registration_enabled
                        )
                      }
                      disabled={!canManage}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                        region.advertiser_registration_enabled
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {region.advertiser_registration_enabled ? "ALLOWED" : "RESTRICTED"}
                    </button>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-slate-800">
                    {region.default_currency || "USD"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        region.default_payment_provider === "RAZORPAY"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}
                    >
                      {region.default_payment_provider || "STRIPE"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {canManage && (
                      <button
                        onClick={() => setSelectedRegion({ ...region })}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        title="Configure Region Details"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Region Modal */}
      {selectedRegion && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Globe className="w-5 h-5 text-indigo-600" />
                Configure {selectedRegion.name} ({selectedRegion.code})
              </div>
              <button
                onClick={() => setSelectedRegion(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Currency
                  </label>
                  <input
                    type="text"
                    value={selectedRegion.default_currency}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, default_currency: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Payment Gateway
                  </label>
                  <select
                    value={selectedRegion.default_payment_provider}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, default_payment_provider: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                  >
                    <option value="STRIPE">Stripe</option>
                    <option value="RAZORPAY">Razorpay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedRegion.ads_enabled}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, ads_enabled: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Enable Advertising Marketplace in this Region
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedRegion.payments_enabled}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, payments_enabled: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Enable Payment Gateways & Budget Top-ups in this Region
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedRegion.advertiser_registration_enabled}
                    onChange={(e) =>
                      setSelectedRegion({
                        ...selectedRegion,
                        advertiser_registration_enabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Allow Users in this Region to Register as Advertisers
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRegion(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Regional Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
