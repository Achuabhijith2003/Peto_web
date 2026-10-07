import { PawPrint } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useFeature } from "../../hooks/useFeatures";
import { CANONICAL_NAV_ITEMS } from "../../data/navigation";

const LeftSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMarketplaceEnabled = useFeature("PETO_ADS_MARKETPLACE");

  const menu = CANONICAL_NAV_ITEMS.filter(
    (item) => !item.requiresFeature || (item.requiresFeature === "PETO_ADS_MARKETPLACE" && isMarketplaceEnabled)
  );

  const isActive = (path: string) => {
    if (path === "/social") {
      return location.pathname === "/social" || location.pathname === "/";
    }
    return location.pathname === path;
  };

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* User Identity Context Card */}
        <Link
          to="/profile"
          className="block rounded-3xl bg-white p-6 shadow-sm border border-slate-100/80 transition-all hover:shadow-md hover:border-slate-200/80 group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
              <img 
                src={user.profile.avatar_url} 
                alt={user.username} 
                className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-sm group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <PawPrint size={24} />
              </div>
            )}

            <div className="truncate">
              <h3 className="font-headline font-bold text-base text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                {user?.profile?.full_name || user?.username || "Guest Parent"}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {user?.profile?.bio 
                  ? (user.profile.bio.length > 22 ? user.profile.bio.substring(0, 22) + "..." : user.profile.bio) 
                  : "Pet Parent Community"}
              </p>
            </div>
          </div>
        </Link>

        {/* Primary Product Navigation Menu */}
        <nav aria-label="Primary Navigation" className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100/80">
          <div className="space-y-1.5">
            {menu.map(({ icon: Icon, label, route }) => {
              const active = isActive(route);
              return (
                <Link
                  to={route}
                  key={route}
                  className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-amber-50 text-amber-700 font-bold shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={20} className={active ? "text-amber-500" : "text-slate-400"} />
                  <span className="font-headline text-sm">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default LeftSidebar;
