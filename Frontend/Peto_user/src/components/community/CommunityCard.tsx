import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, Lock, Globe, Check, Loader2, Plus } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    cover_image_url?: string | null;
    icon_url?: string | null;
    visibility: "public" | "private";
    member_count: number;
    post_count: number;
    viewer?: {
      is_member: boolean;
      role: "owner" | "moderator" | "member" | null;
      status: "active" | "pending" | "banned" | null;
      is_banned: boolean;
    };
  };
  onJoinChange?: (communityId: string, newStatus: string) => void;
}

const CommunityCard = ({ community, onJoinChange }: CommunityCardProps) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [isMember, setIsMember] = useState(community.viewer?.is_member || false);
  const [memberStatus, setMemberStatus] = useState<string | null>(community.viewer?.status || null);
  const [memberCount, setMemberCount] = useState(community.member_count || 1);
  const [loading, setLoading] = useState(false);

  const isPending = memberStatus === "pending";
  const isOwner = community.viewer?.role === "owner";

  const handleCardClick = () => {
    navigate(`/community/${community.slug || community.id}`);
  };

  const handleJoinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal("join communities and connect with pet lovers");
      return;
    }

    if (isOwner) {
      navigate(`/community/${community.slug || community.id}`);
      return;
    }

    try {
      setLoading(true);
      if (isMember || isPending) {
        // Leave community
        await api.delete(`/communities/${community.id}/membership`);
        setIsMember(false);
        setMemberStatus(null);
        setMemberCount((prev) => Math.max(1, prev - 1));
        if (onJoinChange) onJoinChange(community.id, "left");
      } else {
        // Join community
        const res = await api.post(`/communities/${community.id}/join`);
        if (res.data?.status === "active") {
          setIsMember(true);
          setMemberStatus("active");
          setMemberCount((prev) => prev + 1);
          if (onJoinChange) onJoinChange(community.id, "active");
        } else if (res.data?.status === "pending") {
          setMemberStatus("pending");
          if (onJoinChange) onJoinChange(community.id, "pending");
        }
      }
    } catch (err: any) {
      console.error("Join/Leave error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card transition-all duration-150 hover:border-slate-300 hover:shadow-card-hover cursor-pointer"
    >
      {/* Header Banner Cover */}
      <div className="relative h-24 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        {community.cover_image_url ? (
          <img
            src={community.cover_image_url}
            alt={community.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-linear-to-br from-slate-100 via-slate-50 to-slate-200/60 flex items-center justify-center">
            <div className="w-full h-full opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px]" />
          </div>
        )}

        {/* Privacy Pill */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md border border-slate-200/60 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-micro backdrop-blur-xs">
          {community.visibility === "private" ? (
            <>
              <Lock size={11} className="text-slate-500" />
              <span>Private</span>
            </>
          ) : (
            <>
              <Globe size={11} className="text-emerald-600" />
              <span>Public</span>
            </>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="relative flex flex-1 flex-col p-4 pt-0">
        {/* Floating Avatar & Action */}
        <div className="-mt-5 mb-3 flex items-end justify-between">
          <div className="h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-slate-100 shadow-micro shrink-0 flex items-center justify-center font-bold text-slate-700 text-sm">
            {community.icon_url ? (
              <img
                src={community.icon_url}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{community.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Join / Status Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleJoinToggle}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-micro ${
              isOwner
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/60"
                : isMember
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100/70 border border-amber-200/80"
                : isPending
                ? "bg-slate-100 text-slate-500 border border-slate-200/40 cursor-default"
                : "bg-slate-900 text-white hover:bg-slate-800 border border-slate-950/20 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin shrink-0" />
            ) : isOwner ? (
              <span>Owner</span>
            ) : isMember ? (
              <>
                <Check size={13} className="text-amber-700" />
                <span>Joined</span>
              </>
            ) : isPending ? (
              <span>Requested</span>
            ) : (
              <>
                <Plus size={13} />
                <span>{community.visibility === "private" ? "Request" : "Join"}</span>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded border border-slate-200/60 bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 tracking-tight">
              {community.category || "General"}
            </span>
          </div>

          <h3 className="text-base font-semibold tracking-tight text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
            {community.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {community.description || "A curated space for pet lovers to share updates, advice, and stories."}
          </p>
        </div>

        {/* Stats Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-slate-400" />
            <span>{memberCount.toLocaleString()} members</span>
          </div>

          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} className="text-slate-400" />
            <span>{(community.post_count || 0).toLocaleString()} posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;

