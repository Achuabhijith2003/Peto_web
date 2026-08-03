import React, { useState, useEffect, useCallback } from "react";
import { UserPlus, UserCheck, CheckCircle2, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export interface SuggestedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
  followersCount?: number;
}

const SuggestedFriends: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const fetchSuggested = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await api.get("/user/suggested?page=1&limit=5");
      if (res.data?.success) {
        setSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load suggested friends:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchSuggested();
  }, [fetchSuggested]);

  const handleToggleFollow = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFollowing = !!followingMap[targetId];

    setLoadingMap((prev) => ({ ...prev, [targetId]: true }));
    setFollowingMap((prev) => ({ ...prev, [targetId]: !isFollowing }));

    try {
      if (isFollowing) {
        await api.delete(`/user/${targetId}/follow`);
      } else {
        await api.post(`/user/${targetId}/follow`);
      }
    } catch (err) {
      console.error("Follow error:", err);
      setFollowingMap((prev) => ({ ...prev, [targetId]: isFollowing }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleProfileClick = (targetId: string) => {
    navigate(`/profile/${targetId}`);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Users size={18} className="text-amber-500" />
          Suggested Friends
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 size={20} className="animate-spin text-amber-500" />
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No suggestions available.</p>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item) => {
            const isFollowing = !!followingMap[item.id];

            return (
              <div
                key={item.id}
                onClick={() => handleProfileClick(item.id)}
                className="group flex items-center justify-between rounded-2xl p-2 transition hover:bg-amber-50/60 cursor-pointer"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {item.avatar_url && item.avatar_url !== "null" ? (
                    <img
                      src={item.avatar_url}
                      alt={item.username}
                      className="h-11 w-11 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                      {item.username ? item.username[0].toUpperCase() : "U"}
                    </div>
                  )}

                  <div className="truncate text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-900 truncate  transition">
                      {item.full_name || item.username}
                      {item.verified && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400">@{item.username}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleToggleFollow(item.id, e)}
                  disabled={loadingMap[item.id]}
                  //  
                  className={`rounded-xl bg-blue-600 px-4 py-2 font-semibold ${
                    isFollowing
                      ? "text-white hover:bg-blue-700 disabled:opacity-50"
                      : "text-white hover:bg-blue-700 disabled:opacity-50"
                  }`}
                >
                  {loadingMap[item.id] ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck size={12} />
                      <p className="ml-2" >Following</p>
                    </>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      Follow
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuggestedFriends;
