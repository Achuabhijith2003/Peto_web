import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  History,
  RotateCcw,
  Download,
  AlertCircle,
} from "lucide-react";
import { CompliancePolicyItem } from "../../types/admin";
import {
  fetchPolicyVersions,
  rollbackPolicy,
  getAdminPolicyPdfUrl,
  downloadAdminPolicyPdf,
} from "../../api/adminApi";
import { PolicyRenderer } from "./PolicyRenderer";

interface PolicyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: CompliancePolicyItem | null;
  onRollbackComplete: () => void;
}

export const PolicyHistoryModal: React.FC<PolicyHistoryModalProps> = ({
  isOpen,
  onClose,
  policy,
  onRollbackComplete,
}) => {
  const [versions, setVersions] = useState<CompliancePolicyItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<CompliancePolicyItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"render" | "diff">("render");

  const loadVersions = useCallback(async () => {
    if (!policy) return;
    try {
      setLoading(true);
      const data = await fetchPolicyVersions(policy.id);
      setVersions(data || []);
      if (data && data.length > 0) {
        setSelectedVersion(data[0]);
      }
    } catch (err) {
      console.error("Failed to load policy versions", err);
    } finally {
      setLoading(false);
    }
  }, [policy]);

  useEffect(() => {
    if (isOpen && policy) {
      loadVersions();
    }
  }, [isOpen, policy, loadVersions]);

  if (!isOpen || !policy) return null;

  const handleRollback = async (v: CompliancePolicyItem) => {
    if (
      !window.confirm(
        `Are you sure you want to rollback to v${v.version}? This will create a new DRAFT revision matching v${v.version} which you can inspect and publish safely without breaking history.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      await rollbackPolicy(policy.id, v.version);
      alert(`Successfully rolled back to v${v.version}! A new revision draft has been created.`);
      onRollbackComplete();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || "Rollback failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#bbf7d0]/50 text-[#006c49] border border-[#006c49]/30">
            ACTIVE
          </span>
        );
      case "DRAFT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            DRAFT
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            SUPERSEDED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Simple line diff calculation
  const renderSimpleDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");

    return (
      <div className="font-mono text-xs leading-relaxed overflow-x-auto p-4 bg-[#1e293b] text-white rounded-2xl">
        <div className="text-slate-400 mb-3 pb-2 border-b border-slate-700 font-semibold">
          Diff Comparison: v{policy.version} (Active) vs v{selectedVersion?.version} (Selected)
        </div>
        {newLines.map((line, idx) => {
          const oldLine = oldLines[idx];
          if (oldLine === line) {
            return (
              <div key={idx} className="text-slate-300">
                &nbsp;&nbsp;{line}
              </div>
            );
          } else {
            return (
              <div key={idx}>
                {oldLine !== undefined && (
                  <div className="text-rose-300 bg-rose-950/40 px-1 rounded">
                    - {oldLine}
                  </div>
                )}
                <div className="text-emerald-300 bg-emerald-950/40 px-1 rounded">
                  + {line}
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#151c27]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#e2e8f8] rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-level-3 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f8] bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f0f3ff] border border-[#dae2f3] text-[#0058be] flex items-center justify-center font-bold">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-heading text-[#151c27]">
                  Version History & Rollback
                </h2>
                <span className="font-mono text-xs text-[#0058be] font-bold">
                  {policy.title}
                </span>
              </div>
              <p className="text-xs text-[#534434]">
                Audit trail of all published, superseded, and draft revisions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Version Timeline */}
          <div className="w-80 border-r border-[#e2e8f8] bg-[#f9faff] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#e2e8f8] bg-white text-xs font-semibold text-[#534434] flex items-center justify-between">
              <span>All Revisions ({versions.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="text-center py-10 text-xs text-[#534434]">
                  Loading timeline...
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#534434]">
                  No versions recorded yet.
                </div>
              ) : (
                versions.map((v) => {
                  const isSelected = selectedVersion?.id === v.id;
                  const isCurrentActive = v.id === policy.id && v.status === "PUBLISHED";

                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? "bg-white border-[#0058be] shadow-sm ring-1 ring-[#0058be]/20"
                          : "bg-white/70 border-[#e2e8f8] hover:bg-white hover:border-[#dae2f3]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-xs text-[#0058be]">
                          v{v.version}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {renderStatusBadge(v.status)}
                        </div>
                      </div>

                      <div className="text-xs text-[#151c27] font-semibold line-clamp-1 mb-1">
                        {v.title}
                      </div>

                      {v.summary_of_changes && (
                        <p className="text-[11px] text-[#534434] line-clamp-2 mb-2 italic">
                          "{v.summary_of_changes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-[#534434] pt-2 border-t border-[#e2e8f8]/60">
                        <span>
                          {v.published_at
                            ? new Date(v.published_at).toLocaleDateString()
                            : new Date(v.created_at).toLocaleDateString()}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[#006c49] font-bold">Currently Live</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Version Inspector / Diff */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedVersion ? (
              <>
                {/* Inspector Header */}
                <div className="px-6 py-3 border-b border-[#e2e8f8] bg-[#fcfdff] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0058be]">
                          v{selectedVersion.version}
                        </span>
                        {renderStatusBadge(selectedVersion.status)}
                        <span className="text-xs text-[#534434]">
                          Effective:{" "}
                          {selectedVersion.effective_date
                            ? new Date(selectedVersion.effective_date).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inspector Actions */}
                  <div className="flex items-center gap-2">
                    {/* Diff vs Render Tabs */}
                    <div className="bg-[#f0f3ff] p-1 rounded-xl border border-[#dae2f3] flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("render")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          activeTab === "render"
                            ? "bg-white text-[#0058be] shadow-sm"
                            : "text-[#534434] hover:text-[#151c27]"
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("diff")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          activeTab === "diff"
                            ? "bg-white text-[#0058be] shadow-sm"
                            : "text-[#534434] hover:text-[#151c27]"
                        }`}
                      >
                        Diff vs Current
                      </button>
                    </div>

                    {/* Download PDF for this revision */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const filename = `peto-${selectedVersion.slug || selectedVersion.policy_type.toLowerCase().replace(/_/g, "-")}-v${selectedVersion.version}.pdf`;
                          await downloadAdminPolicyPdf(selectedVersion.id, filename);
                        } catch (_) {
                          window.open(getAdminPolicyPdfUrl(selectedVersion.id), "_blank");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] text-xs font-semibold border border-[#dae2f3] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </button>

                    {/* Rollback button */}
                    {selectedVersion.version !== policy.version && (
                      <button
                        type="button"
                        onClick={() => handleRollback(selectedVersion)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        title="Rollback to this version"
                      >
                        <RotateCcw size={13} />
                        <span>Rollback to v{selectedVersion.version}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inspector Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "render" ? (
                    <div className="max-w-4xl mx-auto">
                      <PolicyRenderer
                        title={selectedVersion.title}
                        version={selectedVersion.version}
                        effectiveDate={selectedVersion.effective_date}
                        content={selectedVersion.content}
                        viewport="desktop"
                        showToc={true}
                      />
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto">
                      {renderSimpleDiff(policy.content, selectedVersion.content)}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-[#534434]">
                Select a version to inspect details and diff.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e2e8f8] bg-[#fcfdff] flex items-center justify-between text-xs text-[#534434] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="text-[#0058be]" />
            <span>
              Rollback creates a fresh draft revision from the chosen historical state; it never deletes historical audit records.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] font-semibold border border-[#dae2f3] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
