import {
  User,
  LogOut,
  Bookmark,
  UserCircle,
  Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import SearchDropdown from "./SearchDropdown";

import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationPanel from "../social/NotificationPanel";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
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

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm lg:flex">
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          <SearchDropdown />

          {/* Notifications Icon & Dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setDropdownOpen(false);
                }}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 transition focus:outline-none"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[90vw] rounded-3xl bg-white shadow-xl border border-slate-100 z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
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
                className="flex items-center focus:outline-none"
              >
                <img 
                  src={user?.profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.username || "User")} 
                  alt="Profile" 
                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-xl bg-white shadow-lg border border-slate-100 py-2 z-50">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <UserCircle size={18} />
                    Profile
                  </Link>
                  <Link 
                    to="/bookmarks" 
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Bookmark size={18} />
                    Bookmarks
                  </Link>
                  <button 
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-slate-50 text-left"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <User size={20} className="cursor-pointer text-slate-600 hover:text-amber-600" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;