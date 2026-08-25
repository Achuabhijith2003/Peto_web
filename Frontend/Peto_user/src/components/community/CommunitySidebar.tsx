import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Sparkles, Plus, ArrowRight, Shield } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface CommunitySidebarProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  onCreateClick?: () => void;
}

const CATEGORIES = [
  "All",
  "Dogs",
  "Cats",
  "Birds",
  "Fish & Aquatics",
  "Reptiles",
  "Small Pets",
  "Pet Training",
  "Health & Care",
  "Adoption & Rescue",
  "Pet Photography",
];

const CommunitySidebar = ({
  activeCategory = "All",
  onSelectCategory,
  onCreateClick,
}: CommunitySidebarProps) => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [suggestedCommunities, setSuggestedCommunities] = useState<any[]>([]);
  const [loadingJoined, setLoadingJoined] = useState(false);

  useEffect(() => {
    if (user) {
      fetchJoinedCommunities();
      fetchSuggestedCommunities();
    }
  }, [user]);

  const fetchJoinedCommunities = async () => {
    try {
      setLoadingJoined(true);
      const res = await api.get("/communities?sort=joined&limit=5");
      if (res.data?.success) {
        setJoinedCommunities(res.data.data?.communities || []);
      }
    } catch (err) {
      console.error("Error fetching joined communities:", err);
    } finally {
      setLoadingJoined(false);
    }
  };

  const fetchSuggestedCommunities = async () => {
    try {
      const res = await api.get("/communities/suggestions?limit=4");
      if (res.data?.success) {
        setSuggestedCommunities(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching suggested communities:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Community CTA Card */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-950 p-4 text-white shadow-micro">
        <div className="relative z-10">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 mb-2 border border-white/10">
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">Create a Circle</h3>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Build a dedicated community for your favorite breed, city, or pet specialty.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openAuthModal("create and lead a pet community");
                return;
              }
              if (onCreateClick) onCreateClick();
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-all hover:bg-slate-100 shadow-micro cursor-pointer active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Create Circle</span>
          </button>
        </div>
      </div>

      {/* Your Communities Section */}
      {user && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-500" />
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Your Circles</h4>
            </div>
            {joinedCommunities.length > 0 && (
              <span className="rounded border border-slate-200/60 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {joinedCommunities.length}
              </span>
            )}
          </div>

          {loadingJoined ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5 animate-pulse">
                  <div className="h-8 w-8 rounded-md bg-slate-100" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 rounded bg-slate-100" />
                    <div className="h-2 w-12 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : joinedCommunities.length > 0 ? (
            <div className="space-y-1">
              {joinedCommunities.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/community/${c.slug || c.id}`)}
                  className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50 cursor-pointer group border border-transparent hover:border-slate-200/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs border border-slate-200/60">
                      {c.icon_url ? (
                        <img src={c.icon_url} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        c.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-xs text-slate-800 truncate group-hover:text-amber-600 transition-colors">
                        {c.name}
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        {c.member_count?.toLocaleString() || 1} members
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center">
              <p className="text-xs text-slate-400">You haven't joined any circles yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Suggested Communities */}
      {user && suggestedCommunities.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Compass size={16} className="text-slate-500" />
            <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">Suggested Circles</h4>
          </div>

          <div className="space-y-1.5">
            {suggestedCommunities.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/community/${c.slug || c.id}`)}
                className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs border border-slate-200/60">
                    {c.icon_url ? (
                      <img src={c.icon_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      c.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-semibold text-xs text-slate-800 truncate">{c.name}</h5>
                    <p className="text-[10px] text-slate-400">{c.category || "General"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/community/${c.slug || c.id}`);
                  }}
                  className="rounded-md border border-slate-200/80 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition shadow-micro"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Categories */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
        <h4 className="mb-2.5 font-semibold text-xs text-slate-900 uppercase tracking-wider">Categories</h4>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white border border-slate-950 shadow-micro"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommunitySidebar;

