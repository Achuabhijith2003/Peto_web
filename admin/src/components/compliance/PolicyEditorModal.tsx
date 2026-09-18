import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Edit3,
  Columns,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  Send,
  HelpCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Table as TableIcon,
  AlertCircle,
} from "lucide-react";
import {
  CompliancePolicyItem,
  CompliancePolicyType,
} from "../../types/admin";
import { PolicyRenderer } from "./PolicyRenderer";

interface PolicyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyToEdit?: CompliancePolicyItem | null;
  onSaveDraft: (data: {
    id?: string;
    policyType: CompliancePolicyType;
    title: string;
    version: string;
    content: string;
    summaryOfChanges?: string;
    effectiveDate?: string;
    regionCode?: string;
    requiresAcknowledgement?: boolean;
  }) => Promise<void>;
  onOpenPublish?: (draft: CompliancePolicyItem) => void;
  isLoading?: boolean;
}

const POLICY_TYPE_LABELS: Record<CompliancePolicyType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  COMMUNITY_GUIDELINES: "Community Guidelines",
  CONTENT_POLICY: "Content Policy",
  ADVERTISING_POLICY: "Advertising Policy",
  COOKIE_POLICY: "Cookie Policy",
};

export const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({
  isOpen,
  onClose,
  policyToEdit,
  onSaveDraft,
  onOpenPublish,
  isLoading = false,
}) => {
  const isEditing = Boolean(policyToEdit?.id);

  const [policyType, setPolicyType] = useState<CompliancePolicyType>(
    policyToEdit?.policy_type || "TERMS_OF_SERVICE"
  );
  const [title, setTitle] = useState<string>(
    policyToEdit?.title || POLICY_TYPE_LABELS["TERMS_OF_SERVICE"]
  );
  const [version, setVersion] = useState<string>(policyToEdit?.version || "1.0.0");
  const [content, setContent] = useState<string>(policyToEdit?.content || "");
  const [summaryOfChanges, setSummaryOfChanges] = useState<string>(
    policyToEdit?.summary_of_changes || ""
  );
  const [effectiveDate, setEffectiveDate] = useState<string>(
    policyToEdit?.effective_date
      ? new Date(policyToEdit.effective_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [regionCode, setRegionCode] = useState<string>(
    policyToEdit?.region_code || "GLOBAL"
  );
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState<boolean>(
    Boolean(policyToEdit?.requires_acknowledgement)
  );

  // View modes: 'split' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  // Preview viewport: 'desktop' | 'tablet' | 'mobile'
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showMetadataDrawer, setShowMetadataDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (policyToEdit) {
      setPolicyType(policyToEdit.policy_type);
      setTitle(policyToEdit.title);
      setVersion(policyToEdit.version);
      setContent(policyToEdit.content || "");
      setSummaryOfChanges(policyToEdit.summary_of_changes || "");
      setEffectiveDate(
        policyToEdit.effective_date
          ? new Date(policyToEdit.effective_date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setRegionCode(policyToEdit.region_code || "GLOBAL");
      setRequiresAcknowledgement(Boolean(policyToEdit.requires_acknowledgement));
    } else {
      setPolicyType("TERMS_OF_SERVICE");
      setTitle(POLICY_TYPE_LABELS["TERMS_OF_SERVICE"]);
      setVersion("1.0.0");
      setContent(
        "# Terms of Service\n\nWelcome to Peto. By using our platform, you agree to these terms.\n\n## 1. Acceptance of Terms\n\nBy accessing or using Peto mobile and web applications, you agree to be bound by these Terms.\n\n## 2. Privacy & Data\n\nYour privacy is paramount. Please review our Privacy Policy for details.\n"
      );
      setSummaryOfChanges("Initial revision created.");
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setRegionCode("GLOBAL");
      setRequiresAcknowledgement(false);
    }
  }, [policyToEdit, isOpen]);

  if (!isOpen) return null;

  const insertMarkdown = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = document.getElementById("policy-editor-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selected = currentText.substring(start, end) || placeholder;

    const newText =
      currentText.substring(0, start) +
      prefix +
      selected +
      suffix +
      currentText.substring(end);

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 10);
  };

  const handleSave = async (andPublish = false) => {
    if (!title.trim() || !version.trim() || !content.trim()) {
      alert("Please fill in Title, Version, and Policy Markdown Content.");
      return;
    }

    await onSaveDraft({
      id: policyToEdit?.id,
      policyType,
      title,
      version,
      content,
      summaryOfChanges,
      effectiveDate,
      regionCode,
      requiresAcknowledgement,
    });

    if (andPublish && onOpenPublish) {
      onOpenPublish({
        id: policyToEdit?.id || "temp-id",
        policy_type: policyType,
        title,
        version,
        content,
        summary_of_changes: summaryOfChanges,
        effective_date: effectiveDate,
        region_code: regionCode,
        requires_acknowledgement: requiresAcknowledgement,
        status: "DRAFT",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#151c27]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-[#e2e8f8] rounded-3xl w-full max-w-7xl h-[94vh] flex flex-col shadow-level-3 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#e2e8f8] bg-white flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f0f3ff] border border-[#dae2f3] text-[#0058be] flex items-center justify-center font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-heading text-[#151c27]">
                  {isEditing ? `Edit Draft — ${title}` : "Create Policy Revision"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#0058be] font-mono text-xs font-semibold border border-[#dae2f3]">
                  v{version}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                  DRAFT
                </span>
              </div>
              <p className="text-xs text-[#534434]">
                {POLICY_TYPE_LABELS[policyType]} • Slug:{" "}
                <span className="font-mono text-[#0058be]">
                  /{policyType.toLowerCase().replace(/_/g, "-")}
                </span>
              </p>
            </div>
          </div>

          {/* View mode switcher & Viewport switcher */}
          <div className="flex items-center gap-3">
            {/* Split / Editor / Preview Selector */}
            <div className="bg-[#f0f3ff] p-1 rounded-2xl border border-[#dae2f3] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "split"
                    ? "bg-white text-[#0058be] shadow-sm"
                    : "text-[#534434] hover:text-[#151c27]"
                }`}
                title="Split View (Editor + Live Preview)"
              >
                <Columns size={14} />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("editor")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "editor"
                    ? "bg-white text-[#0058be] shadow-sm"
                    : "text-[#534434] hover:text-[#151c27]"
                }`}
                title="Editor Only"
              >
                <Edit3 size={14} />
                <span className="hidden sm:inline">Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "preview"
                    ? "bg-white text-[#0058be] shadow-sm"
                    : "text-[#534434] hover:text-[#151c27]"
                }`}
                title="Preview Only"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            {/* Viewport switch (Desktop / Tablet / Mobile) */}
            {(viewMode === "split" || viewMode === "preview") && (
              <div className="bg-[#f0f3ff] p-1 rounded-2xl border border-[#dae2f3] flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewport("desktop")}
                  className={`p-1.5 rounded-xl text-xs transition ${
                    viewport === "desktop"
                      ? "bg-white text-[#0058be] shadow-sm"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport("tablet")}
                  className={`p-1.5 rounded-xl text-xs transition ${
                    viewport === "tablet"
                      ? "bg-white text-[#0058be] shadow-sm"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                  title="Tablet Preview"
                >
                  <Tablet size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport("mobile")}
                  className={`p-1.5 rounded-xl text-xs transition ${
                    viewport === "mobile"
                      ? "bg-white text-[#0058be] shadow-sm"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                  title="Mobile App Viewport"
                >
                  <Smartphone size={15} />
                </button>
              </div>
            )}

            {/* Metadata Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowMetadataDrawer(!showMetadataDrawer)}
              className={`px-3 py-1.5 rounded-2xl border text-xs font-semibold transition flex items-center gap-1.5 ${
                showMetadataDrawer
                  ? "bg-[#0058be] text-white border-[#0058be]"
                  : "bg-[#f0f3ff] text-[#534434] border-[#dae2f3] hover:text-[#151c27]"
              }`}
            >
              <span>Config</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Collapsible Metadata Drawer */}
        {showMetadataDrawer && (
          <div className="bg-[#f9f9ff] border-b border-[#e2e8f8] px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div>
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Policy Type
              </label>
              <select
                disabled={isEditing}
                value={policyType}
                onChange={(e) => {
                  const t = e.target.value as CompliancePolicyType;
                  setPolicyType(t);
                  setTitle(POLICY_TYPE_LABELS[t]);
                }}
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:border-[#0058be] disabled:opacity-60"
              >
                {Object.entries(POLICY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:border-[#0058be]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Version Tag (SemVer)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.1.0"
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] font-mono focus:outline-none focus:border-[#0058be]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:border-[#0058be]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Summary of Changes (Audit Trail)
              </label>
              <input
                type="text"
                value={summaryOfChanges}
                onChange={(e) => setSummaryOfChanges(e.target.value)}
                placeholder="Brief description of updates made in this version..."
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:border-[#0058be]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#534434] mb-1">
                Region Scope
              </label>
              <select
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="w-full bg-white border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:border-[#0058be]"
              >
                <option value="GLOBAL">Global (All Regions)</option>
                <option value="IN">India (DPDP Act)</option>
                <option value="EU">European Union (GDPR)</option>
                <option value="US">United States (CCPA/COPPA)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="reqAck"
                checked={requiresAcknowledgement}
                onChange={(e) => setRequiresAcknowledgement(e.target.checked)}
                className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be] border-[#dae2f3]"
              />
              <label htmlFor="reqAck" className="text-xs text-[#151c27] cursor-pointer">
                Require user re-acknowledgement on next app open
              </label>
            </div>
          </div>
        )}

        {/* Work Area (Editor / Preview) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel: Markdown Editor */}
          {(viewMode === "split" || viewMode === "editor") && (
            <div
              className={`flex flex-col border-r border-[#e2e8f8] bg-white ${
                viewMode === "split" ? "w-1/2" : "w-full"
              }`}
            >
              {/* Markdown Toolbar */}
              <div className="px-4 py-2 border-b border-[#e2e8f8] bg-[#fcfdff] flex flex-wrap items-center gap-1 text-[#534434]">
                <button
                  type="button"
                  onClick={() => insertMarkdown("**", "**", "bold text")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("*", "*", "italic text")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <div className="w-[1px] h-4 bg-[#dae2f3] mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown("# ", "", "Heading 1")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="H1"
                >
                  <Heading1 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("## ", "", "Heading 2")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="H2"
                >
                  <Heading2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("### ", "", "Heading 3")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="H3"
                >
                  <Heading3 size={14} />
                </button>
                <div className="w-[1px] h-4 bg-[#dae2f3] mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown("- ", "", "List item")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("1. ", "", "Ordered item")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Numbered List"
                >
                  <ListOrdered size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdown(
                      "\n| Item | Description |\n| --- | --- |\n| Option A | Details A |\n"
                    )
                  }
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Insert Table"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("[Link Text](", "https://example.com)")}
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Link"
                >
                  <Link2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertMarkdown("\n> [!NOTE]\n> Important legal clause or notice.\n\n")
                  }
                  className="p-1.5 rounded-lg hover:bg-[#f0f3ff] hover:text-[#0058be] transition text-xs"
                  title="Legal Note / Alert"
                >
                  <AlertCircle size={14} />
                </button>

                <div className="ml-auto text-[11px] text-[#534434] font-mono">
                  {content.length} characters • {content.split(/\s+/).filter(Boolean).length} words
                </div>
              </div>

              {/* Textarea */}
              <textarea
                id="policy-editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter markdown policy content here..."
                className="flex-1 w-full p-5 font-mono text-xs text-[#151c27] leading-relaxed resize-none focus:outline-none bg-white select-text"
              />
            </div>
          )}

          {/* Right Panel: Live User Web / Mobile Preview */}
          {(viewMode === "split" || viewMode === "preview") && (
            <div
              className={`flex-1 flex flex-col bg-[#f0f3ff]/40 overflow-hidden ${
                viewMode === "preview" ? "w-full" : "w-1/2"
              }`}
            >
              <div className="px-4 py-2 border-b border-[#e2e8f8] bg-[#f8faff] flex items-center justify-between text-xs text-[#534434]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold font-heading">
                    Live Rendering Preview ({viewport.toUpperCase()})
                  </span>
                </div>
                <span className="text-[11px] text-[#534434]/80">
                  Matches User Web & Mobile CSS
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                <PolicyRenderer
                  title={title}
                  version={version}
                  effectiveDate={effectiveDate}
                  content={content}
                  viewport={viewport}
                  showToc={viewport === "desktop"}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#e2e8f8] bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-[#534434] flex items-center gap-1.5">
            <HelpCircle size={14} />
            <span>
              Drafts are isolated. Publishing makes this document public on Web & Mobile immediately.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] text-xs font-semibold border border-[#dae2f3] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{isLoading ? "Saving..." : "Save Draft"}</span>
            </button>
            {onOpenPublish && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-[#006c49] hover:bg-[#00553a] text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={14} />
                <span>Save & Publish...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
