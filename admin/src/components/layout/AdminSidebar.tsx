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
  Bell,
  CreditCard,
  Globe,
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
      icon: <LayoutDashboard className="w-4 h-4 text-[#0058be]" />,
    },
    {
      title: "Notifications",
      path: "/notifications",
      icon: <Bell className="w-4 h-4 text-[#f59e0b]" />,
    },
    {
      title: "Moderation",
      path: "/moderation",
      icon: <ShieldAlert className="w-4 h-4 text-[#ba1a1a]" />,
    },
    {
      title: "Users",
      path: "/users",
      icon: <Users className="w-4 h-4 text-[#2170e4]" />,
    },
    {
      title: "Administrators",
      path: "/admins",
      icon: <ShieldCheck className="w-4 h-4 text-[#006c49]" />,
    },
    {
      title: "Roles & Permissions",
      path: "/roles",
      icon: <Shield className="w-4 h-4 text-[#7c3aed]" />,
    },
    {
      title: "Audit Logs",
      path: "/audit-logs",
      icon: <FileText className="w-4 h-4 text-[#b45309]" />,
    },
    {
      title: "Analytics",
      path: "/analytics",
      icon: <BarChart3 className="w-4 h-4 text-[#4f46e5]" />,
    },
    {
      title: "System & Health",
      path: "/system",
      icon: <Server className="w-4 h-4 text-[#006c49]" />,
    },
    {
      title: "Compliance & Legal",
      path: "/compliance",
      icon: <Scale className="w-4 h-4 text-[#0058be]" />,
    },
    {
      title: "Ads & Campaigns",
      path: "/ads",
      icon: <Megaphone className="w-4 h-4 text-[#ea580c]" />,
    },
    {
      title: "Verifications",
      path: "/verifications",
      icon: <ShieldCheck className="w-4 h-4 text-[#d97706]" />,
    },
    {
      title: "Payments & Ledger",
      path: "/payments",
      icon: <CreditCard className="w-4 h-4 text-[#16a34a]" />,
    },
    {
      title: "Regional Controls",
      path: "/regions",
      icon: <Globe className="w-4 h-4 text-[#0058be]" />,
    },
  ];

  const isItemActive = (itemPath: string) => {
    if (itemPath === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside className="w-64 bg-white border-r border-[#e2e8f8] shadow-level-1 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-[#e2e8f8] flex items-center space-x-3 bg-white">
        <div className="w-10 h-10 rounded-2xl bg-white border border-[#e2e8f8] p-1 flex items-center justify-center shadow-xs overflow-hidden">
          <img src="/peto_logo.png" alt="Peto Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <span className="font-heading text-base font-bold tracking-tight text-[#151c27] flex items-center">
            PETO <span className="ml-1.5 text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-full bg-[#fff3d6] text-[#855300] border border-[#ffddb8]">ADMIN</span>
          </span>
          <span className="text-[10px] text-[#534434] font-medium block -mt-0.5">Warm Companionship</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6">
        {/* Core Operations */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#867461]">
            Platform Operations
          </div>
          {coreNavItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? "text-[#0058be] bg-[#e7eefe] font-semibold border border-[#d8e2ff] shadow-sm"
                    : "text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff]"
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
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#e2e8f8] text-[11px] text-[#534434] bg-[#f9f9ff]">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="font-medium">Security Engine</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#e8f7f0] text-[#006c49] border border-[#a3e5c7]">
            RBAC ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
};
