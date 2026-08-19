import { useNavigate } from "react-router-dom";
import { Crown, Shield, MoreHorizontal, Ban, UserMinus, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface CommunityMemberItemProps {
  member: {
    id: string;
    role: "owner" | "moderator" | "member";
    status: string;
    joined_at: string;
    profile?: {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
      verified: boolean;
      bio?: string | null;
    };
  };
  viewerRole?: "owner" | "moderator" | "member" | null;
  onPromoteModerator?: (userId: string) => void;
  onDemoteModerator?: (userId: string) => void;
  onBanMember?: (userId: string, username: string) => void;
}

const CommunityMemberItem = ({
  member,
  viewerRole,
  onPromoteModerator,
  onDemoteModerator,
  onBanMember,
}: CommunityMemberItemProps) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const profile = member.profile;
  if (!profile) return null;

  const isOwner = member.role === "owner";
  const isModerator = member.role === "moderator";
  const canManage = viewerRole === "owner" && !isOwner;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-100 transition hover:border-amber-200/60 hover:shadow-xs">
      <div
        onClick={() => navigate(`/profile/${profile.id}`)}
        className="flex items-center gap-3.5 cursor-pointer group flex-1 min-w-0"
      >
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-amber-100 flex items-center justify-center font-bold text-amber-700">
          {profile.avatar_url && profile.avatar_url !== "null" ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            profile.username.slice(0, 2).toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-headline font-bold text-sm text-slate-900 group-hover:text-amber-600 transition truncate">
              {profile.full_name || profile.username}
            </h4>
            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Crown size={10} className="fill-amber-600" />
                <span>Owner</span>
              </span>
            )}
            {isModerator && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                <Shield size={10} className="fill-blue-600" />
                <span>Moderator</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">@{profile.username}</p>
        </div>
      </div>

      {/* Role Management Actions for Owner */}
      {canManage && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
              {isModerator ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onDemoteModerator) onDemoteModerator(profile.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <UserMinus size={14} className="text-slate-400" />
                  <span>Demote to Member</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onPromoteModerator) onPromoteModerator(profile.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  <ShieldCheck size={14} />
                  <span>Make Moderator</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (onBanMember) onBanMember(profile.id, profile.username);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Ban size={14} />
                <span>Ban from Community</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityMemberItem;
