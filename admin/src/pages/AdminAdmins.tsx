import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import {
  fetchAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  fetchRoles,
  searchPetoUsers,
} from "../api/adminApi";
import { AdminUserItem, AdminRole } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  KeyRound,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";

export const AdminAdmins: React.FC = () => {
  const { admin: currentAdmin, hasPermission } = useAdminAuth();

  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Role Modal
  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null);
  const [editRoleId, setEditRoleId] = useState<string>("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const canCreate = hasPermission("admins.create");
  const canUpdate = hasPermission("admins.update");

  const loadData = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const [adminsRes, rolesRes] = await Promise.all([
        fetchAdmins(1, 50, searchQuery),
        fetchRoles(),
      ]);
      setAdmins(adminsRes.admins);
      setRoles(rolesRes);
      if (rolesRes.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesRes[0].id);
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to load administrators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  // Search Peto users when typing in Add modal
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (userSearchTerm.trim().length >= 2) {
        try {
          const results = await searchPetoUsers(userSearchTerm.trim());
          setUserSearchResults(results);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUserSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [userSearchTerm]);

  const handleToggleStatus = async (adminItem: AdminUserItem) => {
    if (!canUpdate) return;
    try {
      setActionError(null);
      const newStatus = !adminItem.is_active;
      await updateAdmin(adminItem.id, { isActive: newStatus });
      setActionSuccess(
        `Administrator @${adminItem.profile?.username} marked as ${newStatus ? "Active" : "Suspended"}.`
      );
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update administrator status.");
    }
  };

  const handleRevokeAdmin = async (adminItem: AdminUserItem) => {
    if (!canUpdate) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently revoke administrator privileges for @${adminItem.profile?.username}?`
      )
    ) {
      return;
    }

    try {
      setActionError(null);
      await deleteAdmin(adminItem.id);
      setActionSuccess(`Administrator privileges revoked for @${adminItem.profile?.username}.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to revoke administrator.");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRoleId) {
      setActionError("Please select both a target user and an administrative role.");
      return;
    }

    setSubmittingAdd(true);
    setActionError(null);
    try {
      await createAdmin(selectedUser.id, selectedRoleId);
      setActionSuccess(`Assigned admin role to @${selectedUser.username} successfully.`);
      setShowAddModal(false);
      setSelectedUser(null);
      setUserSearchTerm("");
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to assign administrative role.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !editRoleId) return;

    setSubmittingEdit(true);
    setActionError(null);
    try {
      await updateAdmin(editingAdmin.id, { roleId: editRoleId });
      setActionSuccess(`Updated role for @${editingAdmin.profile?.username}.`);
      setEditingAdmin(null);
      loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to change role.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <PageHeader
        title="Administrators"
        description="Manage administrative personnel, assign roles, and audit access permissions."
        breadcrumbs={[
          { label: "Administration", href: "/admins" },
          { label: "Admins & Permissions" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Assign New Admin
              </Button>
            )}
          </div>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin name or username..."
            className="pl-9 text-xs h-9"
          />
        </div>
      </Card>

      {/* Admins Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs font-medium font-heading">Loading administrators roster...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-bold font-heading text-foreground">No administrators found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try refining your search query." : "Ensure migration 11 has been executed."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  {canUpdate && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((item) => {
                  const isCurrent = item.id === currentAdmin?.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {item.profile?.avatar_url ? (
                              <img
                                src={item.profile.avatar_url}
                                alt={item.profile.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              item.profile?.full_name?.charAt(0).toUpperCase() || "A"
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground flex items-center">
                              {item.profile?.full_name || "Admin User"}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-[11px] font-mono">
                              @{item.profile?.username || "unknown"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge type="role" value={item.role?.name || "Admin"} />
                      </TableCell>

                      <TableCell>
                        <StatusBadge type="status" value={item.is_active ? "active" : "suspended"} />
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {item.last_login_at ? new Date(item.last_login_at).toLocaleString() : "Never"}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-[11px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>

                      {canUpdate && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAdmin(item);
                                setEditRoleId(item.role_id);
                              }}
                              title="Change Role"
                              className="h-7 w-7 p-0"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-primary" />
                            </Button>

                            {!isCurrent && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(item)}
                                  title={item.is_active ? "Suspend Administrator" : "Activate Administrator"}
                                  className={`h-7 w-7 p-0 ${
                                    item.is_active
                                      ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30"
                                      : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                                  }`}
                                >
                                  {item.is_active ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRevokeAdmin(item)}
                                  title="Revoke Admin Access"
                                  className="h-7 w-7 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Assign New Admin Modal */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <UserPlus className="w-5 h-5 mr-2 text-primary" />
              Assign Administrative Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search a Peto user account and assign permissions to them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
            {/* Step 1: Search Peto User */}
            <div className="space-y-1.5">
              <Label className="text-xs">1. Find Peto User</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search by username (e.g. miaqwr)..."
                  className="pl-9 text-xs h-9"
                />
              </div>

              {/* Search Results Dropdown */}
              {userSearchResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-xl bg-card border border-border divide-y divide-border shadow-md mt-1">
                  {userSearchResults.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setUserSearchResults([]);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-muted/40 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-foreground">{u.full_name || u.username}</span>
                        <span className="ml-2 font-mono text-muted-foreground">@{u.username}</span>
                      </div>
                      <span className="text-[10px] text-primary font-bold">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">{selectedUser.full_name || selectedUser.username}</p>
                    <p className="font-mono text-muted-foreground text-[11px]">@{selectedUser.username}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    User Selected
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Select Role */}
            <div className="space-y-1.5">
              <Label className="text-xs">2. Select Administrative Role</Label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.description}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAdd || !selectedUser}
              >
                {submittingAdd ? "Assigning..." : "Assign Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog
        open={editingAdmin !== null}
        onOpenChange={(open) => !open && setEditingAdmin(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <KeyRound className="w-5 h-5 mr-2 text-primary" />
              Change Administrative Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Updating role for @{editingAdmin?.profile?.username} ({editingAdmin?.profile?.full_name}):
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Select New Role</Label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingAdmin(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingEdit}
              >
                {submittingEdit ? "Updating..." : "Confirm Role Change"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
