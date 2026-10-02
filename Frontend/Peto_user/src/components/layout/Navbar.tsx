import {
  User,
  LogOut,
  Bookmark,
  UserCircle,
  Bell,
  Sparkles,
  Users,
  Search,
  Clapperboard,
  Edit3,
  Building2,
  Check,
  Settings as SettingsIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import SearchDropdown from "./SearchDropdown";

import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import { useIdentity } from "../../context/IdentityContext";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationPanel from "../social/NotificationPanel";
import VerifiedBadge from "../common/VerifiedBadge";
import { useFeature } from "../../hooks/useFeatures";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { activeIdentity, managedBusinesses, switchIdentity } = useIdentity();
  const { unreadCount } = useNotifications();
  const isMarketplaceEnabled = useFeature("PETO_ADS_MARKETPLACE");
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-micro">
      <div className="mx-auto flex h-16 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1680px] items-center justify-between px-4 sm:px-6 lg:px-8 2xl:px-10">
        <Logo />

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex bg-slate-100/70 p-1 rounded-lg border border-slate-200/60">
          <Link
            to="/social"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive("/social") || isActive("/")
                ? "bg-white text-slate-900 shadow-micro border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Sparkles size={14} className={isActive("/social") || isActive("/") ? "text-amber-600" : "text-slate-400"} />
            <span>Feed</span>
          </Link>

          <Link
            to="/reels"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive("/reels")
                ? "bg-white text-slate-900 shadow-micro border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Clapperboard size={14} className={isActive("/reels") ? "text-amber-600" : "text-slate-400"} />
            <span>Reels</span>
          </Link>

          <Link
            to="/community"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive("/community")
                ? "bg-white text-slate-900 shadow-micro border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Users size={14} className={isActive("/community") ? "text-amber-600" : "text-slate-400"} />
            <span>Circles</span>
          </Link>

          <Link
            to="/search"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive("/search")
                ? "bg-white text-slate-900 shadow-micro border border-slate-200/80 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Search size={14} className={isActive("/search") ? "text-amber-600" : "text-slate-400"} />
            <span>Discover</span>
          </Link>
        </nav>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2.5">
          <SearchDropdown />

          {/* Notifications Icon & Dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setDropdownOpen(false);
                }}
                className={`relative rounded-lg p-2 transition-colors border ${
                  notifOpen
                    ? "bg-slate-100 border-slate-300 text-slate-900"
                    : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white shadow-micro ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] rounded-xl bg-white shadow-popover border border-slate-200/80 z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
                  <NotificationPanel />
                </div>
              )}
            </div>
          )}

          {/* Profile Menu Dropdown */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center focus:outline-none group p-0.5 rounded-full border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <img 
                  src={user?.profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.username || "User")} 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full object-cover shadow-micro"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 overflow-hidden">
                  {/* Current Active Identity Header */}
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Acting Identity
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {activeIdentity.name}
                      </p>
                      {activeIdentity.type === "BUSINESS" && (
                        <VerifiedBadge
                          verified={activeIdentity.isVerified || false}
                          verificationType="BUSINESS_VERIFIED"
                          size={14}
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {activeIdentity.type === "BUSINESS" ? "Business Identity" : `@${user?.username}`}
                    </p>
                  </div>

                  {/* IDENTITY SWITCHER SECTION */}
                  <div className="px-3 py-2 border-b border-slate-100 bg-white">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1 mb-1.5">
                      Switch Identity
                    </p>
                    <div className="space-y-1">
                      {/* Personal Identity */}
                      <button
                        onClick={() => {
                          switchIdentity("PERSON");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                          activeIdentity.type === "PERSON"
                            ? "bg-amber-50 text-amber-900"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <UserCircle size={15} className="text-slate-400 shrink-0" />
                          <span className="truncate">{user?.profile?.full_name || user?.username || "Personal"}</span>
                          <span className="text-[10px] text-slate-400 font-normal">Personal</span>
                        </div>
                        {activeIdentity.type === "PERSON" && <Check size={14} className="text-amber-600 shrink-0" />}
                      </button>

                      {/* Managed Businesses */}
                      {managedBusinesses.map((b) => {
                        const isSelected = activeIdentity.type === "BUSINESS" && activeIdentity.id === b.id;
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              switchIdentity("BUSINESS", b.id);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                              isSelected
                                ? "bg-amber-50 text-amber-900"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 size={15} className="text-amber-500 shrink-0" />
                              <span className="truncate">{b.name}</span>
                              <VerifiedBadge
                                verified={b.is_verified}
                                verificationType="BUSINESS_VERIFIED"
                                size={13}
                              />
                            </div>
                            {isSelected && <Check size={14} className="text-amber-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* NAVIGATION LINKS */}
                  <div className="py-1">
                    {activeIdentity.type === "BUSINESS" ? (
                      <>
                        <Link
                          to={`/business/${activeIdentity.id}`}
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Building2 size={15} className="text-amber-600" />
                          View Business Profile
                        </Link>

                        {isMarketplaceEnabled && (
                          <Link
                            to="/advertiser"
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Sparkles size={15} className="text-slate-400" />
                            Advertiser Control Panel
                          </Link>
                        )}

                        <Link
                          to="/profile"
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserCircle size={15} className="text-slate-400" />
                          My Personal Profile
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link 
                          to="/profile" 
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <UserCircle size={15} className="text-slate-400" />
                          Personal Profile
                        </Link>

                        <Link 
                          to="/edit-profile" 
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Edit3 size={15} className="text-slate-400" />
                          Edit Profile
                        </Link>

                        {managedBusinesses.length > 0 && (
                          <Link 
                            to={`/business/${managedBusinesses[0].id}`} 
                            className="flex items-center justify-between px-3.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50/60 hover:bg-amber-100/70 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 size={15} className="text-amber-600" />
                              <span>{managedBusinesses[0].name} Profile</span>
                            </div>
                            <VerifiedBadge
                              verified={managedBusinesses[0].is_verified}
                              verificationType="BUSINESS_VERIFIED"
                              size={13}
                            />
                          </Link>
                        )}

                        <Link 
                          to="/bookmarks" 
                          className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Bookmark size={15} className="text-slate-400" />
                          Saved Posts
                        </Link>

                        {isMarketplaceEnabled && (
                          <Link 
                            to="/advertiser" 
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Sparkles size={15} className="text-amber-500" />
                            Advertiser Portal
                          </Link>
                        )}
                      </>
                    )}

                    <Link 
                      to="/settings" 
                      className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <SettingsIcon size={15} className="text-slate-400" />
                      Settings
                    </Link>
                  </div>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button 
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-micro hover:bg-slate-800 transition-all border border-slate-950/20 active:scale-[0.98]"
            >
              <User size={14} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;