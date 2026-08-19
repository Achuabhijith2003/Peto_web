import { useState } from "react";
import {
  Users,
  MessageSquare,
  Lock,
  Globe,
  Plus,
  Check,
  Settings,
  Shield,
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

  const [isMember, setIsMember] = useState(community.viewer?.is_member || false);
  const [memberStatus, setMemberStatus] = useState<string | null>(community.viewer?.status || null);
  const [memberCount, setMemberCount] = useState(community.member_count || 1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = community.viewer?.role === "owner" || community.owner_id === user?.id;
  const isModerator = community.viewer?.role === "moderator";
  const isPending = memberStatus === "pending";

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
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm mb-6">
      {/* Cover Image Banner */}
      <div className="relative h-48 sm:h-60 md:h-68 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-600 overflow-hidden">
        {community.cover_image_url && community.cover_image_url !== "null" ? (
          <img
            src={community.cover_image_url}
            alt={community.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/95 via-amber-500/90 to-amber-600/95 flex items-center justify-end p-8">
            <Shield className="h-32 w-32 text-white/10" />
          </div>
        )}

        {/* Share Quick Button */}
        <button
          type="button"
          onClick={handleShare}
          className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-black/60 transition cursor-pointer z-10"
        >
          {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? "Link Copied!" : "Share"}</span>
        </button>
      </div>

      {/* Header Body Bar */}
      <div className="px-6 pb-6 pt-0 relative z-10">
        {/* Row 1: Floating Avatar + Action Buttons */}
        <div className="flex justify-between items-end -mt-14 sm:-mt-16 mb-4">
          {/* Avatar Container */}
          <div className="h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg relative z-20 flex items-center justify-center">
            {community.icon_url && community.icon_url !== "null" ? (
              <img
                src={community.icon_url}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-100 font-headline text-3xl font-bold text-amber-700">
                {community.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={handleJoinToggle}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer ${
                isOwner
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : isMember
                  ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                  : isPending
                  ? "bg-slate-100 text-slate-500 cursor-default"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 hover:shadow-md"
              }`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isOwner ? (
                <span>You Own This Community</span>
              ) : isMember ? (
                <>
                  <Check size={16} />
                  <span>Joined</span>
                </>
              ) : isPending ? (
                <span>Request Pending</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>{community.visibility === "private" ? "Request to Join" : "Join Community"}</span>
                </>
              )}
            </button>

            {(isOwner || isModerator) && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                title="Community Settings & Moderation"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Title, Badges & Handle */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {community.name}
            </h1>

            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              {community.category || "General"}
            </span>

            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {community.visibility === "private" ? (
                <>
                  <Lock size={12} className="text-amber-600" />
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

          <p className="text-xs font-semibold text-slate-400">c/{community.slug}</p>

          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed pt-1">
            {community.description || "Welcome to our pet community! Share pictures, questions, and pet stories."}
          </p>
        </div>

        {/* Row 3: Stats Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-6 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-amber-500" />
            <span>{memberCount.toLocaleString()} Members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={16} className="text-slate-400" />
            <span>{(community.post_count || 0).toLocaleString()} Posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHeader;
