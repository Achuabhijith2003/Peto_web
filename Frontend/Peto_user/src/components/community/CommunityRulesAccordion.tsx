import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Plus, Trash2, Check } from "lucide-react";
import api from "../../utils/api";

interface Rule {
  id: string;
  title: string;
  description: string;
  position: number;
}

interface CommunityRulesAccordionProps {
  communityId: string;
  rules: Rule[];
  canEdit?: boolean;
  onRulesUpdated?: () => void;
}

const CommunityRulesAccordion = ({
  communityId,
  rules,
  canEdit = false,
  onRulesUpdated,
}: CommunityRulesAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleAddRule = async () => {
    if (!newTitle.trim()) return;
    try {
      setSaving(true);
      await api.post(`/communities/${communityId}/rules`, {
        title: newTitle.trim(),
        description: newDesc.trim(),
      });
      setNewTitle("");
      setNewDesc("");
      setIsAdding(false);
      if (onRulesUpdated) onRulesUpdated();
    } catch (err) {
      console.error("Error creating rule:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/communities/${communityId}/rules/${ruleId}`);
      if (onRulesUpdated) onRulesUpdated();
    } catch (err) {
      console.error("Error deleting rule:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-amber-500" />
          <h3 className="font-headline font-bold text-base text-slate-900">Community Rules</h3>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>{isAdding ? "Cancel" : "Add Rule"}</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-4 space-y-3">
          <input
            type="text"
            placeholder="Rule title (e.g. Respect all members)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-xl bg-white px-3.5 py-2 text-xs text-slate-900 outline-none border border-slate-200 focus:border-amber-500"
          />
          <textarea
            rows={2}
            placeholder="Rule description and enforcement expectations..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full resize-none rounded-xl bg-white p-3.5 text-xs text-slate-900 outline-none border border-slate-200 focus:border-amber-500"
          />
          <button
            type="button"
            disabled={saving || !newTitle.trim()}
            onClick={handleAddRule}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition cursor-pointer disabled:opacity-50"
          >
            <Check size={14} />
            <span>Save Rule</span>
          </button>
        </div>
      )}

      {rules && rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={rule.id || idx}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:border-slate-200"
              >
                <div
                  onClick={() => toggleAccordion(idx)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800">{rule.title}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRule(rule.id, e)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isOpen ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {isOpen && rule.description && (
                  <div className="border-t border-slate-50 bg-slate-50/50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                    {rule.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-400">
          No custom rules set yet. The general Peto community guidelines apply.
        </div>
      )}
    </div>
  );
};

export default CommunityRulesAccordion;
