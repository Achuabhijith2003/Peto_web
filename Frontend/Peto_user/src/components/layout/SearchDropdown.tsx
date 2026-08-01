import React, { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

interface UserResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
}

const SearchDropdown: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=5`);
        if (res.data?.success) {
          setResults(res.data.data || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Quick search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = (userId: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/profile/${userId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="relative hidden lg:block" ref={dropdownRef}>
      {/* Search Input Box */}
      <div className="flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm transition focus-within:bg-slate-50 focus-within:ring-2 focus-within:ring-amber-400/50">
        <SearchIcon size={18} className="text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Search Peto..."
          className="ml-2 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 w-44 focus:w-60 transition-all duration-300"
        />
        {loading && <Loader2 size={16} className="animate-spin text-amber-500 ml-1" />}
      </div>

      {/* Popover Dropdown Results */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white p-3 shadow-xl border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
            People & Profiles
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No users found for "{query}"
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-amber-50/80 transition cursor-pointer"
                >
                  {user.avatar_url && user.avatar_url !== "null" ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-9 w-9 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                      {user.username ? user.username[0].toUpperCase() : "U"}
                    </div>
                  )}

                  <div className="truncate text-xs">
                    <div className="flex items-center gap-1 font-semibold text-slate-900 truncate">
                      {user.full_name || user.username}
                      {user.verified && <CheckCircle2 size={13} className="text-blue-500" />}
                    </div>
                    <p className="text-[11px] text-slate-400">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer View All Link */}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition"
          >
            See all results for "{query}"
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
