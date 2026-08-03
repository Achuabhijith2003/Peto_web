import {
  // ShoppingBag,
  // Heart,
  User,
  LogOut,
  Bookmark,
  UserCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import SearchDropdown from "./SearchDropdown";

import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
          {/* <Link className="font-semibold text-amber-600" to="#">
            Shop
          </Link> */}
          {/* <Link to="#">Pet Care AI</Link>
          <Link to="#">Vets</Link>
          <Link to="#">Services</Link>
          <Link to="#">About</Link> */}
          {/* <Link to="/social">Social</Link> */}
          {/* <Link to="/community">Communities</Link> */}
        </nav>

        <div className="flex items-center gap-5">
          <SearchDropdown />

          {/* <ShoppingBag size={20} className="cursor-pointer" />
          <Heart size={20} className="cursor-pointer" /> */}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
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
              <User size={20} className="cursor-pointer" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;