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
} from "lucide-react";
import { fetchAdminTransactions, refundPaymentTransaction } from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Gateway
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Global payment gateway orchestration, double-entry financial ledger, and refund operations.
          </p>
        </div>

        <button
          onClick={loadTransactions}
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settled Volume</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Across {capturedTxs.length} settled payments
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Refunded</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> {refundedTxs.length} refunds executed
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stripe Gateway</p>
            <p className="text-base font-bold text-slate-900 mt-1">Operational</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Global / US / EU (Cards, Wallets)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
            STRIPE
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Razorpay Gateway</p>
            <p className="text-base font-bold text-slate-900 mt-1">Operational</p>
            <p className="text-xs text-slate-500 font-medium mt-1">India (UPI, NetBanking, Cards)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
            RAZORPAY
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {["ALL", "CAPTURED", "PENDING", "FAILED", "REFUNDED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Provider filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Gateways</option>
            <option value="STRIPE">Stripe</option>
            <option value="RAZORPAY">Razorpay</option>
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
            />
          </div>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {displayedTransactions.length} transactions
        </span>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Transaction</th>
                <th className="px-5 py-3.5">Gateway</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Region</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading payment records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs font-medium text-slate-900">{tx.id}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {tx.description || tx.provider_transaction_id || "Advertising Top-Up"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          tx.provider === "RAZORPAY"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {tx.provider}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 text-sm">
                        {tx.currency} {parseFloat(tx.amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tx.status === "CAPTURED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : tx.status === "REFUNDED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : tx.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {tx.status === "CAPTURED" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {tx.status === "REFUNDED" && <RotateCcw className="w-3 h-3 text-amber-600" />}
                        {tx.status === "FAILED" && <XCircle className="w-3 h-3 text-rose-600" />}
                        {tx.status === "PENDING" && <Clock className="w-3 h-3 text-slate-500" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-700">
                        {tx.country || "US"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {tx.status === "CAPTURED" && canManage && (
                        <button
                          onClick={() => {
                            setSelectedTxForRefund(tx);
                            setRefundAmount(tx.amount.toString());
                          }}
                          className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {selectedTxForRefund && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                Issue Refund
              </div>
              <button
                onClick={() => setSelectedTxForRefund(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              You are executing a server-side refund for transaction{" "}
              <span className="font-mono font-bold text-slate-800">{selectedTxForRefund.id}</span>.
              This will update the gateway, debit the financial ledger, and deduct from the advertiser balance.
            </p>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Amount ({selectedTxForRefund.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedTxForRefund.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campaign cancelled by customer request"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxForRefund(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {refundLoading ? "Executing Refund..." : "Confirm & Execute Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
