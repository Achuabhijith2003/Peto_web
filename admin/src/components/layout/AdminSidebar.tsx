import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Shield,
  FileText,
  ShieldAlert,
  BarChart3,
  Megaphone,
  Scale,
  Server,
} from "lucide-react";

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export const AdminSidebar: React.FC = () => {
  const location = useLocation();

  const coreNavItems: NavItem[] = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />,
    },
    {
      title: "Users",
      path: "/users",
      icon: <Users className="w-4 h-4 text-cyan-400" />,
    },
    {
      title: "Administrators",
      path: "/admins",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    },
    {
      title: "Roles & Permissions",
      path: "/roles",
      icon: <Shield className="w-4 h-4 text-purple-400" />,
    },
    {
      title: "Audit Logs",
      path: "/audit-logs",
      icon: <FileText className="w-4 h-4 text-amber-400" />,
    },
  ];

  const roadmapNavItems: NavItem[] = [
    {
      title: "Moderation",
      path: "/placeholder/moderation",
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: "Phase 3",
    },
    {
      title: "Analytics",
      path: "/placeholder/analytics",
      icon: <BarChart3 className="w-4 h-4" />,
      badge: "Phase 4",
    },
    {
      title: "Ads & Campaigns",
      path: "/placeholder/ads",
      icon: <Megaphone className="w-4 h-4" />,
      badge: "Phase 5",
    },
    {
      title: "Compliance & Legal",
      path: "/placeholder/compliance",
      icon: <Scale className="w-4 h-4" />,
      badge: "Phase 6",
    },
    {
      title: "System & Health",
      path: "/placeholder/system",
      icon: <Server className="w-4 h-4" />,
      badge: "Phase 7",
    },
  ];

  const isItemActive = (itemPath: string) => {
    if (itemPath === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white flex items-center">
            PETO <span className="ml-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">ADMIN</span>
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5">Control Center</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6">
        {/* Core Operations */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations
          </div>
          {coreNavItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/25 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Roadmap / Upcoming */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Roadmap
          </div>
          {roadmapNavItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "text-indigo-300 bg-indigo-600/20 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-400 text-[10px] font-mono">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
        <div className="flex items-center justify-between px-2">
          <span>Security Engine</span>
          <span className="text-emerald-400 font-mono font-bold text-[10px]">RBAC ACTIVE</span>
        </div>
      </div>
    </aside>
  );
};
