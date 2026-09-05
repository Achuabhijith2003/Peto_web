import { useState } from "react";
import {
  Users,
  MessageSquare,
  Lock,
  Globe,
  Plus,
  Check,
  Settings,
  Loader2,
  Copy,
  CheckCheck,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface CommunityHeaderProps {
  community: any;
  onCommunityUpdated?: (updated: any) => void;
  onOpenSettings?: () => void;
}

const CommunityHeader = ({
  community,
  onCommunityUpdated,
  onOpenSettings,
}: CommunityHeaderProps) => {
  const { user, openAuthModal } = useAuth();

  const isOwner =
    community.viewer?.role === "owner" ||
    (Boolean(user?.id) && (community.owner_id === user?.id || community.owner?.id === user?.id));
  const isModerator = community.viewer?.role === "moderator";

  const [isMember, setIsMember] = useState(isOwner || community.viewer?.is_member || false);
  const [memberStatus, setMemberStatus] = useState<string | null>(isOwner ? "active" : (community.viewer?.status || null));
  const [memberCount, setMemberCount] = useState(community.member_count || 1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPending = !isOwner && memberStatus === "pending";

  const handleJoinToggle = async () => {
    if (!user) {
      openAuthModal("join this pet community");
      return;
    }

    if (isOwner) return;

    try {
      setLoading(true);
      if (isMember || isPending) {
        await api.delete(`/communities/${community.id}/membership`);
        setIsMember(false);
        setMemberStatus(null);
        setMemberCount((prev: number) => Math.max(1, prev - 1));
        if (onCommunityUpdated) {
          onCommunityUpdated({
            ...community,
            member_count: Math.max(1, (community.member_count || 1) - 1),
            viewer: { ...community.viewer, is_member: false, status: null, role: null },
          });
        }
      } else {
        const res = await api.post(`/communities/${community.id}/join`);
        if (res.data?.status === "active") {
          setIsMember(true);
          setMemberStatus("active");
          setMemberCount((prev: number) => prev + 1);
          if (onCommunityUpdated) {
            onCommunityUpdated({
              ...community,
              member_count: (community.member_count || 0) + 1,
              viewer: { ...community.viewer, is_member: true, status: "active", role: "member" },
            });
          }
        } else if (res.data?.status === "pending") {
          setMemberStatus("pending");
          if (onCommunityUpdated) {
            onCommunityUpdated({
              ...community,
              viewer: { ...community.viewer, is_member: false, status: "pending" },
            });
          }
        }
      }
    } catch (err: any) {
      console.error("Join action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card mb-6">
      {/* Cover Image Banner */}
      <div className="relative h-36 sm:h-48 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        {community.cover_image_url && community.cover_image_url !== "null" ? (
          <img
            src={community.cover_image_url}
            alt={community.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-linear-to-br from-slate-100 via-slate-50 to-slate-200/60 flex items-center justify-center">
            <div className="w-full h-full opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>
        )}

        {/* Share Quick Button */}
        <button
          type="button"
          onClick={handleShare}
          className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-slate-200/60 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur-xs hover:bg-white transition shadow-micro cursor-pointer z-10"
        >
          {copied ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
      </div>

      {/* Header Body Bar */}
      <div className="px-5 pb-5 pt-0 relative z-10">
        {/* Row 1: Floating Avatar + Action Buttons */}
        <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-3">
          {/* Avatar Container */}
          <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-slate-100 shadow-micro relative z-20 flex items-center justify-center font-bold text-slate-800 text-lg">
            {community.icon_url && community.icon_url !== "null" ? (
              <img
                src={community.icon_url}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{community.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleJoinToggle}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all shadow-micro cursor-pointer ${
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
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : isOwner ? (
                <span>Owner</span>
              ) : isMember ? (
                <>
                  <Check size={14} className="text-amber-700" />
                  <span>Joined</span>
                </>
              ) : isPending ? (
                <span>Pending</span>
              ) : (
                <>
                  <Plus size={14} />
                  <span>{community.visibility === "private" ? "Request" : "Join Circle"}</span>
                </>
              )}
            </button>

            {(isOwner || isModerator) && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-micro cursor-pointer"
                title="Community Settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Title, Badges & Handle */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {community.name}
            </h1>

            <span className="rounded border border-slate-200/60 bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-600">
              {community.category || "General"}
            </span>

            <span className="inline-flex items-center gap-1 rounded border border-slate-200/60 bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-600">
              {community.visibility === "private" ? (
                <>
                  <Lock size={12} className="text-slate-500" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Globe size={12} className="text-emerald-600" />
                  <span>Public</span>
                </>
              )}
            </span>
          </div>

          <p className="text-xs font-mono text-slate-400">c/{community.slug}</p>

          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed pt-0.5">
            {community.description || "Welcome to our pet community! Share pictures, questions, and pet stories."}
          </p>
        </div>

        {/* Row 3: Stats Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-5 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" />
            <span>{memberCount.toLocaleString()} Members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} className="text-slate-400" />
            <span>{(community.post_count || 0).toLocaleString()} Posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHeader;

