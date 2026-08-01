import React, { useState, useEffect, useCallback } from "react";
import { X, Users, CheckCircle2, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export interface FollowUserItem {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: "Followers" | "Following";
  followers: FollowUserItem[];
  following: FollowUserItem[];
  onFollowStateChange?: () => void;
}

const FollowListModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  followers,
  following,
  onFollowStateChange,
}) => {
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    title.toLowerCase() as "followers" | "following"
  );
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState(false);

  // Sync activeTab when modal opens with a specific title
  useEffect(() => {
    if (isOpen) {
      setActiveTab(title.toLowerCase() as "followers" | "following");
    }
  }, [isOpen, title]);

  // Fetch logged-in user's following list to accurately initialize follow state
  const loadMyFollowingState = useCallback(async () => {
    if (!currentUser?.id) return;
    setInitialLoading(true);
    try {
      const res = await api.get(`/user/${currentUser.id}/following`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const map: Record<string, boolean> = {};
        res.data.data.forEach((item: any) => {
          const targetUser = item.following || item;
          if (targetUser?.id) {
            map[targetUser.id] = true;
          }
        });
        setFollowingMap(map);
      }
    } catch (err) {
      console.error("Failed to load user following state:", err);
    } finally {
      setInitialLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      loadMyFollowingState();
    }
  }, [isOpen, loadMyFollowingState]);

  if (!isOpen) return null;

  const currentList = activeTab === "followers" ? followers : following;

  const handleToggleFollow = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyFollowing = !!followingMap[targetId];

    setLoadingMap((prev) => ({ ...prev, [targetId]: true }));
    // Optimistic UI update
    setFollowingMap((prev) => ({ ...prev, [targetId]: !isCurrentlyFollowing }));

    try {
      if (isCurrentlyFollowing) {
        await api.delete(`/user/${targetId}/follow`);
      } else {
        await api.post(`/user/${targetId}/follow`);
      }
      onFollowStateChange?.();
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
      // Revert state on error
      setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleProfileClick = (targetId: string) => {
    onClose();
    navigate(`/profile/${targetId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Network Details</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("followers")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "followers"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              activeTab === "following"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Following ({following.length})
          </button>
        </div>

        {/* User List */}
        <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
          {initialLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No {activeTab} to display.
            </div>
          ) : (
            currentList.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isFollowingUser = !!followingMap[u.id];

              return (
                <div
                  key={u.id}
                  onClick={() => handleProfileClick(u.id)}
                  className="group flex items-center justify-between rounded-2xl bg-slate-50/80 p-3 hover:bg-amber-50/60 transition cursor-pointer border border-transparent hover:border-amber-200/50"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {u.avatar_url && u.avatar_url !== "null" ? (
                      <img
                        src={u.avatar_url}
                        alt={u.username}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                        {u.username ? u.username[0].toUpperCase() : "U"}
                      </div>
                    )}

                    <div className="truncate text-xs">
                      <div className="flex items-center gap-1 font-bold text-slate-900 truncate group-hover:text-amber-600 transition">
                        {u.full_name || u.username}
                        {u.verified && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400">@{u.username}</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={(e) => handleToggleFollow(u.id, e)}
                      disabled={loadingMap[u.id]}
                      className={`ml-2 shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isFollowingUser
                          ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200"
                          : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                      }`}
                    >
                      {loadingMap[u.id] ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isFollowingUser ? (
                        <>
                          <UserCheck size={13} />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowListModal;
