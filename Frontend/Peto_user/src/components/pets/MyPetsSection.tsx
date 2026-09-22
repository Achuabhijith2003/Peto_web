import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, PawPrint, Loader2, Check, X } from "lucide-react";
import api from "../../utils/api";
import { PetCard, type PetCardData } from "./PetCard";

interface MyPetsSectionProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export const MyPetsSection: React.FC<MyPetsSectionProps> = ({
  userId,
  isOwnProfile = false,
}) => {
  const [pets, setPets] = useState<PetCardData[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const endpoint = isOwnProfile ? "/pets/my" : `/pets/user/${userId}`;
      const res = await api.get(endpoint);
      if (res.data?.data) {
        setPets(res.data.data);
      }

      if (isOwnProfile) {
        try {
          const inviteRes = await api.get("/pets/invites/pending");
          if (inviteRes.data?.data) {
            setPendingInvites(inviteRes.data.data);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error("Failed to load pets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, isOwnProfile]);

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      setRespondingId(inviteId);
      await api.post(`/pets/invites/${inviteId}/respond`, { accept });
      // Remove from list
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (accept) {
        // Reload pets so newly accepted pet appears immediately
        await loadData();
      }
    } catch (err) {
      console.error("Failed to respond to invite:", err);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <PawPrint size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
              <span>{isOwnProfile ? "My Pets" : "Pets Showcase"}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {pets.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {isOwnProfile
                ? "Manage and showcase your beloved companions"
                : "Animals loved and cared for by this pet parent"}
            </p>
          </div>
        </div>

        {isOwnProfile && (
          <Link
            to="/pets/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs hover:scale-[1.02] transition"
          >
            <Plus size={15} />
            <span>Add Pet</span>
          </Link>
        )}
      </div>

      {/* Pending Pet Invitations Banner */}
      {isOwnProfile && pendingInvites.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Pending Pet Invitations ({pendingInvites.length})
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {pendingInvites.map((inv) => {
              const pet = inv.pet;
              const inviter = inv.inviter;
              const roleDisplay = (inv.relationship || "CO_OWNER").replace(/_/g, " ").toLowerCase();
              const isResponding = respondingId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-amber-200/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-100/70 overflow-hidden flex items-center justify-center shrink-0 border border-amber-200">
                      {pet?.avatar_url ? (
                        <img
                          src={pet.avatar_url}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint size={20} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {pet?.name || "Unnamed Pet"}
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Invited to be a <span className="font-semibold capitalize text-amber-800">{roleDisplay}</span>
                        {inviter?.username && (
                          <span> by <span className="font-medium text-slate-800">@{inviter.username}</span></span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={isResponding}
                      onClick={() => handleRespondInvite(inv.id, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isResponding ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      disabled={isResponding}
                      onClick={() => handleRespondInvite(inv.id, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <X size={13} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 size={24} className="animate-spin text-amber-500" />
          <span className="text-xs">Loading pets...</span>
        </div>
      ) : pets.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-200">
            <PawPrint size={28} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-sm text-slate-800">
              {isOwnProfile ? "No pets added yet" : "No visible pets to showcase"}
            </h4>
            <p className="text-xs text-slate-500">
              {isOwnProfile
                ? "Add your dogs, cats, birds, or other animal friends to your family profile!"
                : "This user has not added any public pets yet or their pets are set to private."}
            </p>
          </div>
          {isOwnProfile && (
            <Link
              to="/pets/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add Your First Pet</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} showParentBadge={isOwnProfile} />
          ))}

          {/* Quick Add Card when has pets */}
          {isOwnProfile && (
            <Link
              to="/pets/new"
              className="border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-2 group transition min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-amber-100 text-slate-500 group-hover:text-amber-600 flex items-center justify-center transition">
                <Plus size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                  Add Another Pet
                </div>
                <div className="text-[10px] text-slate-400">
                  Dogs, cats, birds, and more
                </div>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
