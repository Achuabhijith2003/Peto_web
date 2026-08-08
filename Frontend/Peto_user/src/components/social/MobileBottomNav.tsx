import { House, Search, PlusSquare, Users, User, Clapperboard } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const currentPath = location.pathname;

  const handleCreatePostClick = () => {
    if (!user) {
      openAuthModal("create posts with pet lovers");
      return;
    }
    if (currentPath === "/" || currentPath === "/social") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const textarea = document.querySelector("textarea");
      if (textarea) textarea.focus();
    } else {
      navigate("/social");
    }
  };

  const handleProfileClick = () => {
    if (!user) {
      openAuthModal("view your profile");
      return;
    }
    navigate("/profile");
  };

  const isHomeActive = currentPath === "/" || currentPath === "/social";
  const isReelsActive = currentPath === "/reels";
  const isSearchActive = currentPath === "/search";
  const isCommunityActive = currentPath === "/community";
  const isProfileActive = currentPath.startsWith("/profile");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200/80 bg-white/95 py-2 px-1 shadow-lg backdrop-blur-md lg:hidden">
      {/* Home */}
      <Link
        to="/social"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 text-xs font-medium transition ${
          isHomeActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <House size={20} className={isHomeActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Home</span>
      </Link>

      {/* Reels */}
      <Link
        to="/reels"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-xs font-medium transition ${
          isReelsActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Clapperboard size={20} className={isReelsActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Reels</span>
      </Link>

      {/* Search */}
      <Link
        to="/search"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-xs font-medium transition ${
          isSearchActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Search size={20} className={isSearchActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Search</span>
      </Link>

      {/* Create Post Button */}
      <button
        onClick={handleCreatePostClick}
        type="button"
        className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 transition active:scale-95 hover:bg-amber-600"
        aria-label="Create Post"
      >
        <PlusSquare size={24} className="stroke-[2.2px]" />
      </button>

      {/* Community / Circles */}
      <Link
        to="/community"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium transition ${
          isCommunityActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Users size={22} className={isCommunityActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Circles</span>
      </Link>

      {/* Profile */}
      <button
        onClick={handleProfileClick}
        type="button"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 text-xs font-medium transition ${
          isProfileActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
          <img
            src={user.profile.avatar_url}
            alt={user.username}
            className={`h-6 w-6 rounded-full object-cover border ${
              isProfileActive ? "border-amber-600 ring-2 ring-amber-200" : "border-slate-300"
            }`}
          />
        ) : (
          <User size={22} className={isProfileActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        )}
        <span>Profile</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;