import React, { useState, useEffect } from "react";
import { CheckCircle2, User, Loader2 } from "lucide-react";
import api from "../../utils/api";

export interface MentionUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
}

interface MentionSuggestionsProps {
  query: string;
  onSelect: (user: MentionUser) => void;
  position?: { top?: number; left?: number };
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  query,
  onSelect,
}) => {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setUsers([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(cleanQuery)}&limit=5`);
        if (!cancelled && res.data?.data) {
          setUsers(res.data.data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Mention search error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!query || (users.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className="absolute left-0 top-full mt-1.5 z-40 w-72 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/80 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="px-2.5 py-1 text-2xs font-semibold text-slate-400 uppercase tracking-wider">
        Mention Someone
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-400">
          <Loader2 size={16} className="animate-spin text-amber-500 mr-2" />
          <span className="text-xs">Searching users...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="px-3 py-3 text-center text-xs text-slate-400">
          No matching users found
        </div>
      ) : (
        users.map((user, idx) => (
          <div
            key={user.id}
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition ${
              selectedIndex === idx ? "bg-amber-50/80 text-amber-950" : "hover:bg-slate-50 text-slate-800"
            }`}
          >
            {user.avatar_url && user.avatar_url !== "null" ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <User size={15} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold truncate">
                  {user.full_name || user.username}
                </span>
                {user.verified && (
                  <CheckCircle2 size={12} className="text-amber-500 fill-amber-500 text-white shrink-0" />
                )}
              </div>
              <p className="text-2xs text-slate-400 truncate">@{user.username}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MentionSuggestions;
