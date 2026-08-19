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
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import SearchDropdown from "./SearchDropdown";

import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationPanel from "../social/NotificationPanel";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-2 lg:flex">
          <Link
            to="/social"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/social") || isActive("/")
                ? "bg-amber-50 text-amber-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Sparkles size={16} className={isActive("/social") || isActive("/") ? "text-amber-500" : "text-slate-400"} />
            <span>Feed</span>
          </Link>

          <Link
            to="/reels"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/reels")
                ? "bg-amber-50 text-amber-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Clapperboard size={16} className={isActive("/reels") ? "text-amber-500" : "text-slate-400"} />
            <span>Reels</span>
          </Link>

          <Link
            to="/community"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/community")
                ? "bg-amber-50 text-amber-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Users size={16} className={isActive("/community") ? "text-amber-500" : "text-slate-400"} />
            <span>Circles</span>
          </Link>

          <Link
            to="/search"
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isActive("/search")
                ? "bg-amber-50 text-amber-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Search size={16} className={isActive("/search") ? "text-amber-500" : "text-slate-400"} />
            <span>Discover</span>
          </Link>
        </nav>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3 sm:gap-4">
          <SearchDropdown />

          {/* Notifications Icon & Dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setDropdownOpen(false);
                }}
                className={`relative rounded-full p-2.5 transition focus:outline-none ${
                  notifOpen ? "bg-amber-50 text-amber-600" : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[90vw] rounded-3xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
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
                className="flex items-center focus:outline-none group"
              >
                <img 
                  src={user?.profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.username || "User")} 
                  alt="Profile" 
                  className="h-9 w-9 rounded-full object-cover border-2 border-amber-400/50 group-hover:border-amber-500 shadow-sm transition"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-headline font-bold text-sm text-slate-900 truncate">
                      {user?.profile?.full_name || user?.username || "User"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
                  </div>

                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <UserCircle size={18} className="text-slate-400 group-hover:text-amber-600" />
                    Profile
                  </Link>

                  <Link 
                    to="/edit-profile" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Edit3 size={18} className="text-slate-400 group-hover:text-amber-600" />
                    Edit Profile
                  </Link>

                  <Link 
                    to="/bookmarks" 
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Bookmark size={18} className="text-slate-400 group-hover:text-amber-600" />
                    Saved Posts
                  </Link>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button 
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition text-left"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-amber-500/20 hover:bg-amber-600 transition"
            >
              <User size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;