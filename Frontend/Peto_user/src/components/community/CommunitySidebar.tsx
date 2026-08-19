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
    <div className="space-y-6">
      {/* Create Community CTA Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md mb-3">
            <Sparkles size={20} className="text-amber-200" />
          </div>
          <h3 className="font-headline text-lg font-bold">Build Your Pack</h3>
          <p className="mt-1 text-xs text-amber-100/90 leading-relaxed">
            Create a custom community for your favorite breed, city, or pet interest.
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-amber-800 transition-all hover:bg-amber-50 hover:shadow-md cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Community</span>
          </button>
        </div>
      </div>

      {/* Your Communities Section */}
      {user && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-500" />
              <h4 className="font-headline font-bold text-sm text-slate-900">Your Communities</h4>
            </div>
            {joinedCommunities.length > 0 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                {joinedCommunities.length}
              </span>
            )}
          </div>

          {loadingJoined ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-slate-100" />
                    <div className="h-2.5 w-16 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : joinedCommunities.length > 0 ? (
            <div className="space-y-2">
              {joinedCommunities.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/community/${c.slug || c.id}`)}
                  className="flex items-center justify-between rounded-2xl p-2 transition-all hover:bg-amber-50/60 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-amber-100 font-bold text-amber-700 flex items-center justify-center text-xs">
                      {c.icon_url ? (
                        <img src={c.icon_url} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        c.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-slate-800 truncate group-hover:text-amber-600 transition">
                        {c.name}
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        {c.member_count?.toLocaleString() || 1} members
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-400">You haven't joined any communities yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Suggested Communities */}
      {user && suggestedCommunities.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Compass size={18} className="text-amber-500" />
            <h4 className="font-headline font-bold text-sm text-slate-900">Suggested for You</h4>
          </div>

          <div className="space-y-3">
            {suggestedCommunities.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/community/${c.slug || c.id}`)}
                className="flex items-center justify-between rounded-2xl p-2 transition hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-amber-100 font-bold text-amber-700 flex items-center justify-center text-xs">
                    {c.icon_url ? (
                      <img src={c.icon_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      c.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-800 truncate">{c.name}</h5>
                    <p className="text-[10px] text-slate-400">{c.category || "General"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/community/${c.slug || c.id}`);
                  }}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Categories */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs">
        <h4 className="mb-3 font-headline font-bold text-sm text-slate-900">Explore by Category</h4>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
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
