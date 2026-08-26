"use client";

import { useState } from "react";
import { Loader2, Plus, Shield, Trash2, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { permissionsForHostStaffRole } from "@/lib/host/host-staff-data";
import { useHostStaff } from "@/lib/host/use-host-staff";
import {
  HOST_STAFF_PERMISSION_LABELS,
  HOST_STAFF_ROLE_LABELS,
  type HostStaffMember,
  type HostStaffPermission,
  type HostStaffRole,
} from "@/lib/host/host-staff-types";
import { cn } from "@/lib/utils";

const ALL_PERMISSIONS = Object.keys(
  HOST_STAFF_PERMISSION_LABELS
) as HostStaffPermission[];
const ALL_ROLES = Object.keys(HOST_STAFF_ROLE_LABELS) as HostStaffRole[];

function ReadOnlyPermissionList({ permissions }: { permissions: HostStaffPermission[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 divide-y divide-gray-100">
      {ALL_PERMISSIONS.map((perm) => {
        const allowed = permissions.includes(perm);
        return (
          <div
            key={perm}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="text-sm text-gray-700">{HOST_STAFF_PERMISSION_LABELS[perm]}</span>
            <span
              className={cn(
                "text-[11px] font-semibold px-2.5 py-1 rounded-md",
                allowed
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {allowed ? "Allowed" : "Not allowed"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HostStaffAccessPanel() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { staff, ready, save, remove } = useHostStaff(
    hostId,
    user ? { name: user.fullName, email: user.email } : null
  );

  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [role, setRole] = useState<HostStaffRole>("staff");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !hostId) return;
    if (role === "owner") {
      flash("Only the account holder can be Owner. Choose Manager or Staff.");
      return;
    }
    if (password.trim().length < 6) {
      flash("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      flash("Passwords do not match.");
      return;
    }
    save({
      name: name.trim(),
      email: email.trim(),
      role,
      permissions: permissionsForHostStaffRole(role),
      active: true,
      password: password.trim(),
    });
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setRole("staff");
    setCreating(false);
    flash(
      "Team member added with default access for their role. Platform admin controls area permissions."
    );
  }

  function handleResetPassword(member: HostStaffMember) {
    if (member.role === "owner") return;
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
          <h3 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-green-700" />
            User / Staff
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Invite team members and set login passwords. Area permissions (Allow / Not allow) are
            controlled by platform admin only. Staff sign in at{" "}
            <span className="font-medium text-gray-700">/host/login</span>.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setViewingId(null);
              setResetPassword("");
              setResetConfirm("");
            }}
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">Permissions:</span> only platform admin can change which
        host areas each team member can access. You can view current access below.
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
              {HOST_STAFF_ROLE_LABELS[r]}
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {staff.filter((s) => s.role === r && s.active).length}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {permissionsForHostStaffRole(r).length} default allows
            </p>
          </div>
        ))}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-700" />
            <h4 className="text-sm font-semibold text-gray-900">New team member</h4>
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
                Login password <span className="text-red-500">*</span>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Role template</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as HostStaffRole)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="manager">{HOST_STAFF_ROLE_LABELS.manager}</option>
                <option value="staff">{HOST_STAFF_ROLE_LABELS.staff}</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Default access for this role is applied. Admin can customize later.
              </p>
            </label>
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
        {staff.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500 text-center">
            No team members yet. Add staff to share host dashboard access.
          </p>
        ) : (
          staff.map((member) => {
            const isViewing = viewingId === member.id;
            const locked = member.role === "owner";
            return (
              <div key={member.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          member.role === "owner" && "bg-green-100 text-green-700",
                          member.role === "manager" && "bg-blue-100 text-blue-700",
                          member.role === "staff" && "bg-gray-100 text-gray-600"
                        )}
                      >
                        {HOST_STAFF_ROLE_LABELS[member.role]}
                      </span>
                      {!member.active && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Disabled
                        </span>
                      )}
                      {member.active && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {member.permissions.length} areas allowed
                      {member.role !== "owner" ? (
                        <>
                          {" · "}
                          {member.password ? (
                            <span className="text-green-700">Password set</span>
                          ) : (
                            <span className="text-amber-700">No password — set below</span>
                          )}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!locked && (
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
                              ? `${member.name} disabled.`
                              : `${member.name} enabled.`
                          );
                        }}
                        className="text-xs font-semibold border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg text-gray-600"
                      >
                        {member.active ? "Disable" : "Enable"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isViewing) {
                          setViewingId(null);
                          setResetPassword("");
                          setResetConfirm("");
                        } else {
                          setViewingId(member.id);
                          setCreating(false);
                          setResetPassword("");
                          setResetConfirm("");
                        }
                      }}
                      className="text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg"
                    >
                      {isViewing ? "Close" : "View access"}
                    </button>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Remove ${member.name} from your team?`)) return;
                          remove(member.id);
                          flash("Team member removed.");
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${member.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isViewing && (
                  <div className="space-y-3 pt-1">
                    {!locked && (
                      <div className="rounded-xl border border-gray-100 bg-white p-3 space-y-3 max-w-md">
                        <p className="text-xs font-semibold text-gray-800">
                          Set / reset login password
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="password"
                            value={viewingId === member.id ? resetPassword : ""}
                            onChange={(e) => setResetPassword(e.target.value)}
                            placeholder="New password"
                            minLength={6}
                            autoComplete="new-password"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <input
                            type="password"
                            value={viewingId === member.id ? resetConfirm : ""}
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
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Current access (read-only)
                      </p>
                      <ReadOnlyPermissionList permissions={member.permissions} />
                      <p className="text-xs text-gray-500 mt-2">
                        {locked
                          ? "Owner always has full access."
                          : "To change Allow / Not allow, ask platform admin (Admin → Hosts → this host)."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
