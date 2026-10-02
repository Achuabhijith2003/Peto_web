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
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onNavigateMobile,
}) => {
  const location = useLocation();
  const { hasPermission } = useAdminAuth();

  const navigationGroups: NavGroup[] = [
    {
      group: "Overview",
      items: [
        {
          title: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Analytics",
          path: "/analytics",
          icon: BarChart3,
          permission: "analytics.view",
        },
      ],
    },
    {
      group: "Management",
      items: [
        {
          title: "Users",
          path: "/users",
          icon: Users,
          permission: "users.view",
        },
      ],
    },
    {
      group: "Trust & Safety",
      items: [
        {
          title: "Moderation",
          path: "/moderation",
          icon: ShieldAlert,
          permission: "reports.view",
        },
        {
          title: "Verifications",
          path: "/verifications",
          icon: ShieldCheck,
          permission: "ads.view",
        },
      ],
    },
    {
      group: "Monetization",
      items: [
        {
          title: "Ads Control Center",
          path: "/ads",
          icon: Megaphone,
          permission: "ads.view",
        },
        {
          title: "Payments & Ledger",
          path: "/payments",
          icon: CreditCard,
          permission: "ads.view",
        },
      ],
    },
    {
      group: "Administration",
      items: [
        {
          title: "Notifications",
          path: "/notifications",
          icon: Bell,
        },
        {
          title: "Administrators",
          path: "/admins",
          icon: Shield,
          permission: "admins.view",
        },
        {
          title: "Roles & Permissions",
          path: "/roles",
          icon: ShieldCheck,
          permission: "roles.view",
        },
        {
          title: "Audit Logs",
          path: "/audit-logs",
          icon: FileText,
          permission: "audit_logs.view",
        },
        {
          title: "System & Health",
          path: "/system",
          icon: Server,
          permission: "system.view",
        },
        {
          title: "Compliance & Legal",
          path: "/compliance",
          icon: Scale,
          permission: "compliance.view",
        },
        {
          title: "Regional Controls",
          path: "/regions",
          icon: Globe,
          permission: "system.view",
        },
      ],
    },
  ];

  const isItemActive = (itemPath: string) => {
    if (itemPath === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-200 z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 px-3.5 border-b border-sidebar-border flex items-center justify-between shrink-0 bg-sidebar">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 p-1 flex items-center justify-center shrink-0">
            <img src="/peto_logo.png" alt="Peto Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="font-heading text-sm font-bold tracking-tight text-sidebar-foreground flex items-center gap-1.5">
                PETO <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">ADMIN</span>
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5 truncate">
                Operational Control
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="size-7 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex items-center justify-center transition-colors shrink-0"
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navigationGroups.map((group) => {
          // Filter items by permission
          const visibleItems = group.items.filter((item) => {
            if (!item.permission) return true;
            return hasPermission(item.permission);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed ? (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {group.group}
                </div>
              ) : (
                <div className="h-2" />
              )}

              {visibleItems.map((item) => {
                const active = isItemActive(item.path);
                const IconComponent = item.icon;

                const linkContent = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigateMobile}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all group relative",
                      collapsed ? "justify-center p-2" : "px-3 py-2",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/80"
                    )}
                  >
                    <IconComponent
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                    {active && !collapsed && (
                      <div className="ml-auto size-1.5 rounded-full bg-primary" />
                    )}
                  </NavLink>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger render={linkContent} />
                      <TooltipContent side="right" className="text-xs font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/50 shrink-0 text-xs text-muted-foreground">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              RBAC Guard
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              v1.0
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="RBAC Active">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
