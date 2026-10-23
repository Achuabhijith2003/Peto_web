import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import api from "../../utils/api";

interface MembershipPet {
  id: string;
  name: string;
  viewer_relationship?: { is_parent: boolean; is_primary?: boolean };
  parents?: Array<{
    user_id: string;
    status: string;
    is_primary: boolean;
    full_name?: string;
    username?: string;
    user?: { full_name?: string; username?: string };
  }>;
}

export function PetMembershipActions({ pet, userId, onCompleted, onRefresh }: {
  pet: MembershipPet;
  userId?: string;
  onCompleted: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [action, setAction] = useState<"leave" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [transferred, setTransferred] = useState(false);
  const membership = pet.parents?.find(p => p.user_id === userId && p.status === "ACTIVE");
  const isMember = Boolean(userId && (membership || pet.viewer_relationship?.is_parent));
  const primary = !transferred && isMember && Boolean(membership?.is_primary || pet.viewer_relationship?.is_primary);
  const candidates = (pet.parents || []).filter(p => p.status === "ACTIVE" && p.user_id !== userId);

  if (!isMember) return null;

  const open = (value: "leave" | "delete") => {
    setAction(value);
    setError(null);
    setRecipient("");
    setConfirmation("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !action) return;
    if (action === "delete" && (!primary || confirmation !== "DELETE")) return;
    if (action === "leave" && primary && !recipient) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") {
        await api.delete(`/pets/${pet.id}`);
      } else {
        if (primary) {
          await api.post(`/pets/${pet.id}/transfer-ownership`, { userId: recipient });
          setTransferred(true);
        }
        await api.delete(`/pets/${pet.id}/membership`);
      }
      await onCompleted();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to complete this action. Please try again.");
      // The transfer may have committed before the leave request failed.
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button type="button" disabled={busy} onClick={() => open("leave")}
      className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50">
      Remove from my account
    </button>
    {primary && <button type="button" disabled={busy} onClick={() => open("delete")}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-semibold disabled:opacity-50">
      <Trash2 size={14} /> Delete pet for everyone
    </button>}
    {action && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="pet-membership-title" onSubmit={submit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 id="pet-membership-title" className="text-lg font-bold text-slate-900">
          {action === "delete" ? "Delete pet for everyone?" : "Remove from my account?"}
        </h2>
        {action === "delete" ? <>
          <p className="text-sm text-slate-600">All members will lose access to {pet.name}. The pet will disappear from profiles and discovery. Existing posts and media are retained according to retention policy.</p>
          <label className="block text-sm font-semibold">Type DELETE to confirm
            <input autoFocus autoComplete="off" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 p-2" />
          </label>
        </> : <>
          <p className="text-sm text-slate-600">Only your membership will be removed. Other members will keep access to {pet.name}.</p>
          {primary && <>
            <p className="text-sm text-slate-600">You must transfer primary ownership before leaving. The selected member will become the primary owner.</p>
            {candidates.length ? <label className="block text-sm font-semibold">New primary owner
              <select required disabled={busy} value={recipient} onChange={e => setRecipient(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-2">
                <option value="">Choose an active member</option>
                {candidates.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name || p.user?.full_name || p.username || p.user?.username || "Pet member"}</option>)}
              </select>
            </label> : <p className="text-sm text-amber-800">Invite another member and wait for acceptance before transferring ownership and leaving. You can also cancel and choose “Delete pet for everyone.”</p>}
          </>}
          {transferred && <p className="text-sm text-amber-800">Ownership has transferred. Retry removal to leave your membership.</p>}
        </>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={() => setAction(null)} className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || (action === "delete" ? confirmation !== "DELETE" : primary && !recipient)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">
            {busy ? "Please wait…" : action === "delete" ? "Delete for everyone" : primary ? "Transfer and remove" : "Remove from my account"}
          </button>
        </div>
      </form>
    </div>}
  </>;
}
