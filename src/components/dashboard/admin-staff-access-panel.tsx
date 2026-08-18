"use client";

import { useState } from "react";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { useAdminStaff } from "@/lib/admin/use-admin-staff";
import { permissionsForRole } from "@/lib/admin/staff-data";
import {
  STAFF_PERMISSION_LABELS,
  STAFF_ROLE_LABELS,
  type StaffMember,
  type StaffPermission,
  type StaffRole,
} from "@/lib/admin/staff-types";
import { cn } from "@/lib/utils";

const ALL_PERMISSIONS = Object.keys(STAFF_PERMISSION_LABELS) as StaffPermission[];
const ALL_ROLES = Object.keys(STAFF_ROLE_LABELS) as StaffRole[];

function PermissionAllowRow({
  perm,
  allowed,
  disabled,
  onChange,
}: {
  perm: StaffPermission;
  allowed: boolean;
  disabled?: boolean;
  onChange: (allowed: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{STAFF_PERMISSION_LABELS[perm]}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
            allowed
              ? "bg-green-700 text-white border-green-700"
              : "bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Allow
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
            !allowed
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-800",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Not allow
        </button>
      </div>
    </div>
  );
}

function PermissionMatrix({
  permissions,
  locked,
  onToggle,
}: {
  permissions: StaffPermission[];
  locked?: boolean;
  onToggle: (perm: StaffPermission, allowed: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 divide-y divide-transparent">
      {ALL_PERMISSIONS.map((perm) => (
        <PermissionAllowRow
          key={perm}
          perm={perm}
          allowed={permissions.includes(perm)}
          disabled={locked}
          onChange={(allowed) => onToggle(perm, allowed)}
        />
      ))}
    </div>
  );
}

export function AdminStaffAccessPanel() {
  const { staff, ready, save, remove } = useAdminStaff();
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [role, setRole] = useState<StaffRole>("support");
  const [permissions, setPermissions] = useState<StaffPermission[]>(
    permissionsForRole("support")
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function handleRoleChange(next: StaffRole) {
    setRole(next);
    setPermissions(permissionsForRole(next));
  }

  function setPerm(list: StaffPermission[], perm: StaffPermission, allowed: boolean) {
    if (allowed) return list.includes(perm) ? list : [...list, perm];
    return list.filter((p) => p !== perm);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (role !== "admin") {
      if (password.trim().length < 6) {
        flash("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        flash("Passwords do not match.");
        return;
      }
    } else if (password.trim() && password !== confirmPassword) {
      flash("Passwords do not match.");
      return;
    } else if (password.trim() && password.trim().length < 6) {
      flash("Password must be at least 6 characters.");
      return;
    }
    save({
      name: name.trim(),
      email: email.trim(),
      role,
      permissions,
      active: true,
      password: password.trim() || undefined,
    });
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("support");
    setPermissions(permissionsForRole("support"));
    setCreating(false);
    flash(
      role === "admin"
        ? "Staff member added."
        : "Staff member added. They can sign in at /admin/login with this email and password."
    );
  }

  function startEdit(member: StaffMember) {
    setEditingId(member.id);
    setCreating(false);
    setResetPassword("");
    setResetConfirm("");
  }

  function saveEdit(member: StaffMember, nextPerms: StaffPermission[], nextRole?: StaffRole) {
    const nextRoleValue = nextRole ?? member.role;
    save({
      id: member.id,
      name: member.name,
      email: member.email,
      role: nextRoleValue,
      permissions: nextRoleValue === "admin" ? permissionsForRole("admin") : nextPerms,
      active: member.active,
    });
    flash(`Access updated for ${member.name}.`);
  }

  function handleResetPassword(member: StaffMember) {
    if (resetPassword.trim().length < 6) {
      flash("Password must be at least 6 characters.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      flash("Passwords do not match.");
      return;
    }
    save({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      permissions: member.permissions,
      active: member.active,
      password: resetPassword.trim(),
    });
    setResetPassword("");
    setResetConfirm("");
    flash(`Password updated for ${member.name}.`);
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 font-display">Staff access</h3>
          <p className="text-gray-500 text-sm mt-1">
            Allow or not allow each admin area per staff member. Set a login password when adding
            Sub-admin / Support — they sign in at{" "}
            <span className="font-medium text-gray-700">/admin/login</span>. Super Admin always
            has full access.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setPassword("");
              setConfirmPassword("");
              setResetPassword("");
              setResetConfirm("");
            }}
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add staff
          </button>
        )}
      </div>

      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ALL_ROLES.map((r) => (
          <div key={r} className="bg-white rounded-2xl border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {STAFF_ROLE_LABELS[r]}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {staff.filter((s) => s.role === r && s.active).length}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {permissionsForRole(r).length} default allows
            </p>
          </div>
        ))}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-700" />
            <h4 className="text-sm font-semibold text-gray-900">New staff member</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">
                Login password{" "}
                {role !== "admin" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-gray-400 font-normal">(optional)</span>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={role !== "admin"}
                minLength={role !== "admin" ? 6 : undefined}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={role !== "admin"}
                minLength={role !== "admin" ? 6 : undefined}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Role template</span>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {STAFF_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Area access</p>
            <PermissionMatrix
              permissions={permissions}
              locked={role === "admin"}
              onToggle={(perm, allowed) =>
                setPermissions((prev) => setPerm(prev, perm, allowed))
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              Save staff
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-sm font-medium text-gray-600 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden divide-y">
        {staff.map((member) => {
          const isEditing = editingId === member.id;
          const locked = member.role === "admin";
          return (
            <div key={member.id} className="px-5 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        member.role === "admin" && "bg-green-100 text-green-700",
                        member.role === "sub_admin" && "bg-blue-100 text-blue-700",
                        member.role === "support" && "bg-gray-100 text-gray-600"
                      )}
                    >
                      {STAFF_ROLE_LABELS[member.role]}
                    </span>
                    {!member.active && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        Not allowed
                      </span>
                    )}
                    {member.active && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        Allowed in
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {member.password ? (
                      <span className="text-green-700">Password set</span>
                    ) : member.role === "admin" ? (
                      <span>No password (demo Super Admin can sign in without one)</span>
                    ) : (
                      <span className="text-amber-700">No password — set under Edit access</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      save({
                        id: member.id,
                        name: member.name,
                        email: member.email,
                        role: member.role,
                        permissions: member.permissions,
                        active: !member.active,
                      });
                      flash(
                        member.active
                          ? `${member.name} is not allowed to sign in.`
                          : `${member.name} is allowed to sign in.`
                      );
                    }}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-lg border",
                      member.active
                        ? "border-gray-200 text-gray-600 hover:border-gray-400"
                        : "border-green-200 text-green-700 hover:bg-green-50"
                    )}
                  >
                    {member.active ? "Block login" : "Allow login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(member))}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 px-2 py-1.5"
                  >
                    {isEditing ? "Close" : "Edit access"}
                  </button>
                  {member.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Remove ${member.name}?`)) return;
                        remove(member.id);
                        flash("Staff member removed.");
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="space-y-3 pt-1">
                  {!locked && (
                    <label className="block max-w-xs">
                      <span className="text-xs font-medium text-gray-600 mb-1 block">
                        Role template
                      </span>
                      <select
                        value={member.role}
                        onChange={(e) => {
                          const nextRole = e.target.value as StaffRole;
                          saveEdit(member, permissionsForRole(nextRole), nextRole);
                        }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {ALL_ROLES.filter((r) => r !== "admin").map((r) => (
                          <option key={r} value={r}>
                            {STAFF_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-3 max-w-md">
                    <p className="text-xs font-semibold text-gray-800">Set / reset login password</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        value={editingId === member.id ? resetPassword : ""}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="New password"
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="password"
                        value={editingId === member.id ? resetConfirm : ""}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        placeholder="Confirm"
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(member)}
                      className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg"
                    >
                      Save password
                    </button>
                  </div>
                  <PermissionMatrix
                    permissions={member.permissions}
                    locked={locked}
                    onToggle={(perm, allowed) => {
                      if (locked) return;
                      saveEdit(member, setPerm(member.permissions, perm, allowed));
                    }}
                  />
                  {locked && (
                    <p className="text-xs text-gray-500">
                      Super Admin always has Allow on every area.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
