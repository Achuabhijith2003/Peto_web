import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("peto_admin_sidebar_collapsed") === "true";
    } catch (_) {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("peto_admin_sidebar_collapsed", String(next));
      } catch (_) {}
      return next;
    });
  };

  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <AdminSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              onNavigateMobile={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader onOpenMobileSidebar={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-[1440px] mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
