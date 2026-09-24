import React, { useState } from "react";
import { X, UserPlus, Trash2, CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";
import api from "../../utils/api";

interface PetParentModalProps {
  petId: string;
  petName: string;
  parents: any[];
  canManage: boolean;
  currentUserId?: string;
  onClose: () => void;
  onUpdated: () => void;
}

export const PetParentModal: React.FC<PetParentModalProps> = ({
  petId,
  petName,
  parents,
  canManage,
  currentUserId,
  onClose,
  onUpdated,
}) => {
  const [invitee, setInvitee] = useState("");
  const [relationship, setRelationship] = useState("CO_OWNER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitee.trim()) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await api.post(`/pets/${petId}/parents/invite`, {
        invitee: invitee.trim(),
        relationship,
      });

      setSuccess(`Invitation sent to "${invitee}"!`);
      setInvitee("");
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to send invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveParent = async (parentUserId: string, parentName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${parentName}" as a parent of ${petName}?`)) {
      return;
    }

    setError(null);
    setActionLoadingId(parentUserId);

    try {
      await api.delete(`/pets/${petId}/parents/${parentUserId}`);
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to remove pet parent.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {petName}'s Pet Parents & Caregivers
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage authorized humans who co-own and care for {petName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Active Parents List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Current Pet Parents ({parents.length})
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {parents.map((parent) => {
                const isMe = parent.user_id === currentUserId;
                const canRemoveThis = canManage && !parent.is_primary;

                return (
                  <div key={parent.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <img
                        src={parent.user?.avatar_url || `https://ui-avatars.com/api/?name=${parent.user?.username || "Parent"}`}
                        alt={parent.user?.username}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{parent.user?.full_name || parent.user?.username || "Pet Parent"}</span>
                          {parent.is_primary && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              Primary Owner
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {(parent.relationship || (parent as any).relationship_type || "CO_OWNER").toLowerCase().replace(/_/g, " ")}
                        </div>
                      </div>
                    </div>

                    {canRemoveThis && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParent(parent.user_id, parent.user?.username || "Parent")}
                        disabled={actionLoadingId === parent.user_id}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Remove parent"
                      >
                        {actionLoadingId === parent.user_id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite New Parent Form */}
          {canManage && (
            <form onSubmit={handleInvite} className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <UserPlus size={14} className="text-amber-500" />
                <span>Invite Co-Parent or Caregiver</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Username or User ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={invitee}
                    onChange={(e) => setInvitee(e.target.value)}
                    placeholder="e.g. sarah_99"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Relationship Role *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="CO_OWNER">Co-Owner</option>
                    <option value="PET_PARENT">Pet Parent</option>
                    <option value="FAMILY_MEMBER">Family Member</option>
                    <option value="CAREGIVER">Caregiver</option>
                    <option value="FOSTER_PARENT">Foster Parent</option>
                    <option value="GUARDIAN">Guardian</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting || !invitee.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Send Parent Invitation</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
