import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, Lock, Globe, Check, Loader2, Plus, Sparkles } from "lucide-react";
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
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/80 hover:shadow-xl cursor-pointer"
    >
      {/* Banner Cover */}
      <div className="relative h-28 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 overflow-hidden">
        {community.cover_image_url ? (
          <img
            src={community.cover_image_url}
            alt={community.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/90 to-amber-600/90 opacity-90 flex items-center justify-end p-4">
            <Sparkles className="text-white/20 h-16 w-16" />
          </div>
        )}

        {/* Privacy Pill */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {community.visibility === "private" ? (
            <>
              <Lock size={12} className="text-amber-300" />
              <span>Private</span>
            </>
          ) : (
            <>
              <Globe size={12} className="text-emerald-300" />
              <span>Public</span>
            </>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="relative flex flex-1 flex-col p-5 pt-0">
        {/* Floating Icon */}
        <div className="-mt-8 mb-3 flex items-end justify-between">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
            {community.icon_url ? (
              <img
                src={community.icon_url}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-100 font-headline text-xl font-bold text-amber-700">
                {community.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Join Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleJoinToggle}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs ${
              isOwner
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : isMember
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                : isPending
                ? "bg-slate-100 text-slate-500 cursor-default"
                : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 hover:shadow-md"
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isOwner ? (
              <span>Owner</span>
            ) : isMember ? (
              <>
                <Check size={14} />
                <span>Joined</span>
              </>
            ) : isPending ? (
              <span>Requested</span>
            ) : (
              <>
                <Plus size={14} />
                <span>{community.visibility === "private" ? "Request" : "Join"}</span>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              {community.category || "General"}
            </span>
          </div>

          <h3 className="font-headline text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition">
            {community.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {community.description || "A wonderful place for pet enthusiasts to connect, share tips, and celebrate companionship."}
          </p>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Users size={14} className="text-amber-500" />
            <span>{memberCount.toLocaleString()} members</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <MessageSquare size={14} className="text-slate-400" />
            <span>{(community.post_count || 0).toLocaleString()} posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;
