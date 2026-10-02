import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  X,
  ArrowUpRight,
} from "lucide-react";
import { fetchAdminTransactions, refundPaymentTransaction } from "../api/adminApi";
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

export const AdminPayments: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission("ads.manage");

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Refund Modal State
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminTransactions({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        provider: providerFilter !== "ALL" ? providerFilter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (res.success) {
        setTransactions(res.transactions || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxForRefund) return;

    setRefundLoading(true);
    try {
      const res = await refundPaymentTransaction({
        transactionId: selectedTxForRefund.id,
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason || "Administrative refund",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Refund of ${selectedTxForRefund.currency} ${refundAmount || selectedTxForRefund.amount} processed successfully.`,
        });
        setSelectedTxForRefund(null);
        setRefundAmount("");
        setRefundReason("");
        loadTransactions();
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || err.message || "Failed to process refund.",
      });
    } finally {
      setRefundLoading(false);
    }
  };

  // Metrics
  const capturedTxs = transactions.filter((t) => t.status === "CAPTURED");
  const totalVolume = capturedTxs.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const refundedTxs = transactions.filter((t) => t.status === "REFUNDED");
  const totalRefunded = refundedTxs.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const displayedTransactions = transactions.filter(
    (t) =>
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.provider_transaction_id && t.provider_transaction_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Payments & Ledger"
        description="Global payment gateway orchestration, double-entry financial ledger, and refund operations."
        badge={
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
            Live Gateway
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Settled Volume */}
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Settled Volume
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="size-3" /> Across {capturedTxs.length} settled payments
              </p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Refunded */}
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Refunded
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                ${totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <RotateCcw className="size-3" /> {refundedTxs.length} refunds executed
              </p>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <RotateCcw className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stripe Gateway */}
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Stripe Gateway
              </p>
              <p className="text-base font-bold text-foreground">Operational</p>
              <p className="text-[11px] text-muted-foreground">Global / US / EU (Cards, Wallets)</p>
            </div>
            <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold">
              STRIPE
            </Badge>
          </CardContent>
        </Card>

        {/* Razorpay Gateway */}
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Razorpay Gateway
              </p>
              <p className="text-base font-bold text-foreground">Operational</p>
              <p className="text-[11px] text-muted-foreground">India (UPI, NetBanking, Cards)</p>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold">
              RAZORPAY
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
              {["ALL", "CAPTURED", "PENDING", "FAILED", "REFUNDED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
                    statusFilter === st
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="h-8 px-2.5 bg-background border border-border text-foreground text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="ALL">All Gateways</option>
              <option value="STRIPE">Stripe</option>
              <option value="RAZORPAY">Razorpay</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs w-48 bg-background border-border"
              />
            </div>
          </div>

          <span className="text-xs text-muted-foreground font-mono self-end md:self-center">
            Showing {displayedTransactions.length} transactions
          </span>
        </CardContent>
      </Card>

      {/* Transactions Table Card */}
      <Card className="rounded-2xl border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Transaction</TableHead>
                <TableHead className="text-xs font-semibold">Gateway</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Region</TableHead>
                <TableHead className="text-xs font-semibold">Created At</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs">Loading payment records...</span>
                  </TableCell>
                </TableRow>
              ) : displayedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center text-muted-foreground">
                    <CreditCard className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <span className="text-xs font-medium">No transactions found matching the selected filters.</span>
                  </TableCell>
                </TableRow>
              ) : (
                displayedTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors border-b border-border/60">
                    <TableCell className="py-3 font-mono">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>{tx.id}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                        {tx.description || tx.provider_transaction_id || "Advertising Top-Up"}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px] font-bold uppercase",
                          tx.provider === "RAZORPAY"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
                        )}
                      >
                        {tx.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-bold font-mono text-foreground text-xs">
                        {tx.currency} {parseFloat(tx.amount || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 text-[11px] font-medium",
                          tx.status === "CAPTURED" &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                          tx.status === "REFUNDED" &&
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
                          tx.status === "FAILED" &&
                            "bg-destructive/10 text-destructive border-destructive/25",
                          tx.status === "PENDING" &&
                            "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {tx.status === "CAPTURED" && <CheckCircle2 className="size-3 text-emerald-500" />}
                        {tx.status === "REFUNDED" && <RotateCcw className="size-3 text-amber-500" />}
                        {tx.status === "FAILED" && <XCircle className="size-3 text-destructive" />}
                        {tx.status === "PENDING" && <Clock className="size-3 text-muted-foreground" />}
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-foreground font-semibold">
                        {tx.country || "US"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {tx.status === "CAPTURED" && canManage && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setSelectedTxForRefund(tx);
                            setRefundAmount(tx.amount.toString());
                          }}
                          className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-[11px]"
                        >
                          Refund
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

      {/* Refund Modal */}
      {selectedTxForRefund && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <Card className="rounded-3xl p-6 max-w-md w-full shadow-2xl border-border bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <RotateCcw className="size-4 text-amber-500" />
                <span>Issue Refund</span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedTxForRefund(null)}
                aria-label="Close"
              >
                <X className="size-4 text-muted-foreground" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You are executing a server-side refund for transaction{" "}
              <span className="font-mono font-bold text-foreground">{selectedTxForRefund.id}</span>.
              This will update the gateway, debit the financial ledger, and deduct from the advertiser balance.
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Refund Amount ({selectedTxForRefund.currency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  max={selectedTxForRefund.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Refund
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Campaign cancelled by customer request"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTxForRefund(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={refundLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {refundLoading ? "Executing Refund..." : "Confirm & Execute Refund"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
