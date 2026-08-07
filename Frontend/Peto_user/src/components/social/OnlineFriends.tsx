import React, { useState, useEffect, useCallback } from "react";
import { Circle, Loader2, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export interface OnlineUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
  is_online?: boolean;
}

const OnlineFriends: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [onlineList, setOnlineList] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // Send heartbeat to mark self online
  const sendHeartbeat = useCallback(async () => {
    if (!currentUser) return;
    try {
      await api.post("/presence/heartbeat");
    } catch {
      // Ignore heartbeat errors
    }
  }, [currentUser]);

  // Fetch online friends list
  const fetchOnlineFriends = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get("/presence/online");
      if (res.data?.success) {
        setOnlineList(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch online friends:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Send initial heartbeat and fetch online friends
    sendHeartbeat();
    fetchOnlineFriends();

    // Periodic heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    // Periodic refresh of online friends list every 20 seconds
    const friendsInterval = setInterval(fetchOnlineFriends, 20000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(friendsInterval);
    };
  }, [currentUser, sendHeartbeat, fetchOnlineFriends]);

  const handleProfileClick = (targetId: string) => {
    navigate(`/profile/${targetId}`);
  };

  const visibleFriends = onlineList.slice(0, visibleCount);
  const hasMoreVisible = onlineList.length > visibleCount;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-headline font-bold text-base text-slate-900 flex items-center gap-2">
          <Wifi size={18} className="text-emerald-500" />
          Active Pals
        </h3>
        {onlineList.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/50">
            {onlineList.length} Online
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
        </div>
      ) : onlineList.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-400">
          No friends currently online.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleFriends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => handleProfileClick(friend.id)}
              className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-emerald-50/60 cursor-pointer"
            >
              <div className="relative shrink-0">
                {friend.avatar_url && friend.avatar_url !== "null" ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.username}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                    {friend.username ? friend.username[0].toUpperCase() : "U"}
                  </div>
                )}

                <Circle
                  size={12}
                  className="absolute bottom-0 right-0 fill-emerald-500 text-emerald-500 ring-2 ring-white rounded-full"
                />
              </div>

              <div className="truncate text-xs">
                <p className="font-bold text-slate-900 truncate group-hover:text-emerald-600 transition">
                  {friend.full_name || friend.username}
                </p>
                <p className="text-[11px] text-slate-400">@{friend.username}</p>
              </div>
            </div>
          ))}

          {/* Read More button */}
          {hasMoreVisible && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="w-full rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm border border-emerald-100"
              >
                Read More ({onlineList.length - visibleCount} more)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnlineFriends;