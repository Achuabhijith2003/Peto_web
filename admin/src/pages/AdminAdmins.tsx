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
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-indigo-400" />
            Administrators
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage administrative personnel, assign roles, and audit access permissions.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all self-start cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign New Admin</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin name or username..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Loading administrators roster..." />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No administrators found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? "Try refining your search query." : "Ensure migration 11 has been executed."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Administrator</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Last Login</th>
                  <th className="px-6 py-3.5">Assigned Date</th>
                  {canUpdate && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {admins.map((item) => {
                  const isCurrent = item.id === currentAdmin?.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
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
                            <div className="font-semibold text-slate-100 flex items-center">
                              {item.profile?.full_name || "Admin User"}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono">
                              @{item.profile?.username || "unknown"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge type="role" value={item.role?.name || "Admin"} />
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge type="status" value={item.is_active ? "active" : "suspended"} />
                      </td>

                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {item.last_login_at ? new Date(item.last_login_at).toLocaleString() : "Never"}
                      </td>

                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>

                      {canUpdate && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingAdmin(item);
                                setEditRoleId(item.role_id);
                              }}
                              title="Change Role"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {!isCurrent && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(item)}
                                  title={item.is_active ? "Suspend Administrator" : "Activate Administrator"}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    item.is_active
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                  }`}
                                >
                                  {item.is_active ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleRevokeAdmin(item)}
                                  title="Revoke Admin Access"
                                  className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign New Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-indigo-400" />
                Assign Administrative Role
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUser(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              {/* Step 1: Search Peto User */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-slate-400">
                  1. Find Peto User
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search by username (e.g. miaqwr)..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Search Results Dropdown */}
                {userSearchResults.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/60 mt-1">
                    {userSearchResults.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearchResults([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-200">{u.full_name || u.username}</span>
                          <span className="ml-2 font-mono text-slate-500">@{u.username}</span>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-semibold">Select</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUser && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-indigo-200">{selectedUser.full_name || selectedUser.username}</p>
                      <p className="font-mono text-slate-400 text-[11px]">@{selectedUser.username}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      User Selected
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Select Role */}
              <div className="space-y-1.5">
                <label className="block font-semibold uppercase tracking-wider text-slate-400">
                  2. Select Administrative Role
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd || !selectedUser}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {submittingAdd ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center">
                <KeyRound className="w-5 h-5 mr-2 text-indigo-400" />
                Change Administrative Role
              </h2>
              <button onClick={() => setEditingAdmin(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
              <p className="text-slate-300">
                Updating role for{" "}
                <strong className="text-white">@{editingAdmin.profile?.username}</strong> ({editingAdmin.profile?.full_name}):
              </p>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select New Role
                </label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {submittingEdit ? "Updating..." : "Confirm Role Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
