import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  CreditCard,
  Megaphone,
  Search,
  X,
} from "lucide-react";
import { fetchAdminRegions, updateAdminRegion } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Regional Control Center"
        description="Configure country-specific monetization rules, advertising availability, and payment gateway routing."
        badge={
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
            Global Compliance
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadRegions}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-xl flex items-center justify-between border text-xs font-medium animate-in fade-in duration-200",
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 text-destructive shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search country or currency (e.g. India, US, EUR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 h-8 text-xs bg-background border-border"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono self-end sm:self-center">
            {filtered.length} regions configured
          </span>
        </CardContent>
      </Card>

      {/* Regions Grid / Table */}
      <Card className="rounded-2xl border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Region / Country</TableHead>
                <TableHead className="text-xs font-semibold">Ads Enabled</TableHead>
                <TableHead className="text-xs font-semibold">Payments</TableHead>
                <TableHead className="text-xs font-semibold">Advertiser Reg</TableHead>
                <TableHead className="text-xs font-semibold">Default Currency</TableHead>
                <TableHead className="text-xs font-semibold">Primary Gateway</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && regions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs">Loading regional parameters...</span>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                    <Globe className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <span className="text-xs font-medium">No regions match your search criteria.</span>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((region) => (
                  <TableRow key={region.code} className="hover:bg-muted/40 transition-colors border-b border-border/60">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted flex items-center justify-center font-mono font-bold text-xs text-foreground border border-border">
                          {region.code}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-xs">{region.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{region.continent || "GLOBAL"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        onClick={() => handleToggle(region.code, "ads_enabled", region.ads_enabled)}
                        disabled={!canManage}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                          region.ads_enabled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        )}
                      >
                        <Megaphone className="size-3" />
                        <span>{region.ads_enabled ? "ON" : "OFF"}</span>
                      </button>
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        onClick={() => handleToggle(region.code, "payments_enabled", region.payments_enabled)}
                        disabled={!canManage}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                          region.payments_enabled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        )}
                      >
                        <CreditCard className="size-3" />
                        <span>{region.payments_enabled ? "ON" : "OFF"}</span>
                      </button>
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        onClick={() =>
                          handleToggle(
                            region.code,
                            "advertiser_registration_enabled",
                            region.advertiser_registration_enabled
                          )
                        }
                        disabled={!canManage}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                          region.advertiser_registration_enabled
                            ? "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20"
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                        )}
                      >
                        <span>{region.advertiser_registration_enabled ? "ALLOWED" : "RESTRICTED"}</span>
                      </button>
                    </TableCell>
                    <TableCell className="py-3 font-mono text-xs font-bold text-foreground">
                      {region.default_currency || "USD"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-mono font-bold uppercase",
                          region.default_payment_provider === "RAZORPAY"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
                        )}
                      >
                        {region.default_payment_provider || "STRIPE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setSelectedRegion({ ...region })}
                          title="Configure Region Details"
                        >
                          <Sliders className="size-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Region Modal */}
      {selectedRegion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <Card className="rounded-3xl p-6 max-w-lg w-full shadow-2xl border-border bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Globe className="size-4 text-primary" />
                <span>Configure {selectedRegion.name} ({selectedRegion.code})</span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedRegion(null)}
                aria-label="Close"
              >
                <X className="size-4 text-muted-foreground" />
              </Button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Default Currency
                  </label>
                  <Input
                    type="text"
                    value={selectedRegion.default_currency}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, default_currency: e.target.value.toUpperCase() })
                    }
                    className="font-mono text-sm uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Default Payment Gateway
                  </label>
                  <select
                    value={selectedRegion.default_payment_provider}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, default_payment_provider: e.target.value })
                    }
                    className="h-8 w-full px-2.5 bg-background border border-border text-foreground text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="STRIPE">Stripe</option>
                    <option value="RAZORPAY">Razorpay</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border">
                <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRegion.ads_enabled}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, ads_enabled: e.target.checked })
                    }
                    className="rounded border-border text-primary accent-primary"
                  />
                  <span>Enable Advertising Marketplace in this Region</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRegion.payments_enabled}
                    onChange={(e) =>
                      setSelectedRegion({ ...selectedRegion, payments_enabled: e.target.checked })
                    }
                    className="rounded border-border text-primary accent-primary"
                  />
                  <span>Enable Payment Gateways & Budget Top-ups in this Region</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRegion.advertiser_registration_enabled}
                    onChange={(e) =>
                      setSelectedRegion({
                        ...selectedRegion,
                        advertiser_registration_enabled: e.target.checked,
                      })
                    }
                    className="rounded border-border text-primary accent-primary"
                  />
                  <span>Allow Users in this Region to Register as Advertisers</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRegion(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Regional Rules"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminRegions;
