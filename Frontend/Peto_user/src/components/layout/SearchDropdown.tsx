import React, { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import VerifiedBadge from "../common/VerifiedBadge";

interface UserResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
  type?: "USER" | "BUSINESS";
  is_business?: boolean;
  category?: string;
  verification_badge_type?: string;
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

  const handleSelectUser = (user: UserResult) => {
    setIsOpen(false);
    setQuery("");
    if (user.type === "BUSINESS" || user.is_business) {
      navigate(`/business/${user.id}`);
    } else {
      navigate(`/profile/${user.id}`);
    }
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
            People & Businesses
          </div>

          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {results.map((user) => {
                const isBiz = user.type === "BUSINESS" || user.is_business;
                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-amber-50/80 transition cursor-pointer"
                  >
                    {user.avatar_url && user.avatar_url !== "null" ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className={`h-9 w-9 rounded-full object-cover border ${
                          isBiz ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs ${
                          isBiz
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.username ? user.username[0].toUpperCase() : "U"}
                      </div>
                    )}

                    <div className="truncate text-xs flex-1">
                      <div className="flex items-center gap-1 font-semibold text-slate-900 truncate">
                        <span className="truncate">{user.full_name || user.username}</span>
                        {isBiz ? (
                          <VerifiedBadge verified={true} verificationType="BUSINESS_VERIFIED" size={13} />
                        ) : (
                          user.verified && (
                            <VerifiedBadge verified={true} verificationType="PERSON_VERIFIED" size={13} />
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>@{user.username}</span>
                        {isBiz && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-700 border border-amber-200">
                            {user.category || "Business"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
