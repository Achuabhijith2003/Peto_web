import React, { useState, useRef, useEffect } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { StatusBadge } from "../ui/StatusBadge";
import {
  Shield,
  LogOut,
  ChevronDown,
  KeyRound,
  Clock,
} from "lucide-react";

export const AdminHeader: React.FC = () => {
  const { admin, logout } = useAdminAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: System status & Environment */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Peto Operational Network</span>
          <span className="text-slate-500 font-mono text-[10px]">v1.0-alpha</span>
        </div>
      </div>

      {/* Right side: Admin profile & actions */}
      <div className="flex items-center space-x-4">
        {admin && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                {admin.avatarUrl ? (
                  <img
                    src={admin.avatarUrl}
                    alt={admin.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  admin.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-200 leading-tight">
                  {admin.fullName}
                </div>
                <div className="text-[11px] text-slate-400">@{admin.username}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                  <p className="text-sm font-bold text-slate-100 truncate">{admin.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono truncate mb-2">@{admin.username}</p>
                  <div className="flex items-center justify-between pt-1">
                    <StatusBadge type="role" value={admin.role.name} />
                    <span className="text-[11px] text-indigo-400 flex items-center font-mono">
                      <KeyRound className="w-3 h-3 mr-1" />
                      {admin.role.name === "Super Admin" ? "All Permissions" : `${admin.permissions.length} perms`}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2 text-[11px] text-slate-400 space-y-1 border-b border-slate-800">
                  <div className="flex items-center text-slate-400">
                    <Clock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>Last Login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleTimeString() : "Current Session"}</span>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <Shield className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>RBAC: Server-Side Enforced</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out of Admin Control Center
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
