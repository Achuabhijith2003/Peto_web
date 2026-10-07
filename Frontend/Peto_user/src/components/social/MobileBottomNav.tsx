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
    if (currentPath !== "/" && currentPath !== "/social") {
      navigate("/social");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-create-post-modal"));
    }, 50);
  };

  const handleProfileClick = () => {
    if (!user) {
      openAuthModal("view your profile");
      return;
    }
    navigate("/profile");
  };

  const isFeedActive = currentPath === "/" || currentPath === "/social";
  const isReelsActive = currentPath === "/reels";
  const isExploreActive = currentPath === "/search";
  const isCommunityActive = currentPath === "/community" || currentPath.startsWith("/community/");
  const isProfileActive = currentPath.startsWith("/profile");

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200/80 bg-white/95 py-2 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md lg:hidden"
    >
      {/* Feed */}
      <Link
        to="/social"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 text-xs font-medium transition ${
          isFeedActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <House size={20} className={isFeedActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Feed</span>
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

      {/* Create Post Button */}
      <button
        onClick={handleCreatePostClick}
        type="button"
        className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30 transition active:scale-95 hover:bg-amber-600"
        aria-label="Create Post"
      >
        <PlusSquare size={24} className="stroke-[2.2px]" />
      </button>

      {/* Explore */}
      <Link
        to="/search"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-xs font-medium transition ${
          isExploreActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Search size={20} className={isExploreActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Explore</span>
      </Link>

      {/* Communities */}
      <Link
        to="/community"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-xs font-medium transition ${
          isCommunityActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Users size={20} className={isCommunityActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        <span>Communities</span>
      </Link>

      {/* Profile */}
      <button
        onClick={handleProfileClick}
        type="button"
        className={`flex flex-col items-center justify-center gap-1 py-1 px-2 text-xs font-medium transition ${
          isProfileActive ? "text-amber-600 font-semibold" : "text-slate-500 hover:text-slate-800"
        }`}
        aria-label="Your Profile"
      >
        {user?.profile?.avatar_url && user.profile.avatar_url !== "null" ? (
          <img
            src={user.profile.avatar_url}
            alt={user.username || "Profile"}
            className={`h-5 w-5 rounded-full object-cover border ${
              isProfileActive ? "border-amber-600 ring-2 ring-amber-200" : "border-slate-300"
            }`}
          />
        ) : (
          <User size={20} className={isProfileActive ? "stroke-[2.5px]" : "stroke-[1.8px]"} />
        )}
        <span>Profile</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;