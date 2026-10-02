import React, { useState, useEffect } from "react";
import { fetchRoles, fetchPermissions } from "../api/adminApi";
import { AdminRole, AdminPermission } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "matrix">("roles");

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);
      setRoles(rolesRes);
      setPermissions(permsRes);
    } catch (err: any) {
      setError(err.message || "Failed to load roles and permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group permissions by module
  const permsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, AdminPermission[]>);

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-xs font-medium font-heading">Loading RBAC Roles and Permissions Catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Roles & Permissions Matrix"
        description="System RBAC structure and granular permission boundaries enforcing platform security."
        breadcrumbs={[
          { label: "Administration", href: "/roles" },
          { label: "Admins & Permissions", href: "/admins" },
          { label: "Roles Matrix" },
        ]}
        actions={
          <div className="flex bg-muted/60 border border-border rounded-xl p-1 self-start">
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "roles"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Role Cards ({roles.length})
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Permissions Matrix ({permissions.length})
            </button>
          </div>
        }
      />

      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {/* Role Cards View */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => (
            <Card
              key={role.id}
              className="p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge type="role" value={role.name} />
                  {role.is_system && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border flex items-center font-semibold">
                      <Lock className="w-2.5 h-2.5 mr-1" />
                      SYSTEM
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                  {role.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="font-semibold font-heading text-foreground">Granted Permissions</span>
                  <span className="font-mono text-primary text-[11px] font-bold">
                    {role.name === "Super Admin" ? "All System Permissions" : `${role.permissions?.length || 0} granted`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {role.name === "Super Admin" ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                      * (Wildcard - Unrestricted Access)
                    </span>
                  ) : (
                    role.permissions?.map((p) => (
                      <span
                        key={p.code}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border"
                      >
                        {p.code}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Permissions Matrix Table View */}
      {activeTab === "matrix" && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-xs font-bold font-heading text-foreground uppercase tracking-wider">
              Catalog of Registered System Permissions
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Every operation across Peto Admin is protected by these authoritative RBAC scopes.
            </p>
          </div>

          <div className="divide-y divide-border">
            {Object.entries(permsByModule).map(([moduleName, perms]) => (
              <div key={moduleName} className="p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                    {moduleName}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({perms.length} permission{perms.length === 1 ? "" : "s"})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((perm) => (
                    <div
                      key={perm.code}
                      className="p-3 rounded-xl bg-muted/30 border border-border space-y-1"
                    >
                      <div className="font-mono text-xs font-bold text-foreground">
                        {perm.code}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {perm.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
