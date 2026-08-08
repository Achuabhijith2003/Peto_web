import {
  Bookmark,
  House,
  PawPrint,
  Users,
  Search,
  Clapperboard,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { Link, useLocation } from "react-router-dom";

const menu = [
  { icon: House, label: "Home Feed", path: "/social" },
  { icon: Clapperboard, label: "Pet Reels", path: "/reels" },
  { icon: Search, label: "Explore", path: "/search" },
  { icon: Users, label: "Communities", path: "/community" },
  { icon: Bookmark, label: "Saved Posts", path: "/bookmarks" },
];

const LeftSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* User Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/80">
          <div className="flex items-center gap-4">
            {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
              <img 
                src={user.profile.avatar_url} 
                alt={user.username} 
                className="h-14 w-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-sm"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-sm shadow-amber-500/20">
                <PawPrint size={24} />
              </div>
            )}

            <div className="truncate">
              <h3 className="font-headline font-bold text-base text-slate-900 truncate">
                {user?.profile?.full_name || user?.username || "Guest Parent"}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {user?.profile?.bio 
                  ? (user.profile.bio.length > 22 ? user.profile.bio.substring(0, 22) + "..." : user.profile.bio) 
                  : "Pet Parent Community"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100/80">
          <div className="space-y-1.5">
            {menu.map(({ icon: Icon, label, path }) => {
              const active = isActive(path);
              return (
                <Link
                  to={path}
                  key={label}
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
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
