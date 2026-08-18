"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
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

function PermissionAllowRow({
  perm,
  allowed,
  disabled,
  onChange,
}: {
  perm: HostStaffPermission;
  allowed: boolean;
  disabled?: boolean;
  onChange: (allowed: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{HOST_STAFF_PERMISSION_LABELS[perm]}</span>
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
            disabled && "opacity-50 cursor-not-allowed hover:border-gray-200 hover:text-gray-500"
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
            disabled && "opacity-50 cursor-not-allowed hover:border-gray-200 hover:text-gray-500"
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
  permissions: HostStaffPermission[];
  locked?: boolean;
  onToggle: (perm: HostStaffPermission, allowed: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3">
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

/**
 * Platform admin control of a host’s team permissions.
 * Hosts can invite staff; only admin can Allow / Not allow areas.
 */
export function AdminHostStaffPermissionsPanel({
  hostId,
  hostName,
  hostEmail,
}: {
  hostId: string;
  hostName: string;
  hostEmail: string;
}) {
  const { staff, ready, save } = useHostStaff(hostId, {
    name: hostName,
    email: hostEmail,
  });
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function setPerm(
    list: HostStaffPermission[],
    perm: HostStaffPermission,
    allowed: boolean
  ) {
    if (allowed) return list.includes(perm) ? list : [...list, perm];
    return list.filter((p) => p !== perm);
  }

  function saveEdit(
    member: HostStaffMember,
    nextPerms: HostStaffPermission[],
    nextRole?: HostStaffRole
  ) {
    const nextRoleValue = nextRole ?? member.role;
    if (member.role === "owner" && nextRoleValue !== "owner") {
      flash("Owner role cannot be changed.");
      return;
    }
    save({
      id: member.id,
      name: member.name,
      email: member.email,
      role: nextRoleValue,
      permissions:
        nextRoleValue === "owner"
          ? permissionsForHostStaffRole("owner")
          : nextPerms,
      active: member.active,
    });
    flash(`Permissions updated for ${member.name}.`);
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Host team permissions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Only platform admin can allow or block host dashboard areas. The host can still invite
            staff and set passwords; access rights are controlled here.
          </p>
        </div>
      </div>

      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      {staff.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No team members for this host yet.
        </p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {staff.map((member) => {
            const isEditing = editingId === member.id;
            const locked = member.role === "owner";
            return (
              <div key={member.id} className="px-4 py-3 space-y-3 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {member.permissions.length} areas allowed
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : member.id)}
                    className="text-xs font-semibold border border-green-200 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg shrink-0"
                  >
                    {isEditing ? "Close" : "Permissions"}
                  </button>
                </div>

                {isEditing && (
                  <div className="space-y-3">
                    {!locked && (
                      <label className="block max-w-xs">
                        <span className="text-xs font-medium text-gray-600 mb-1 block">Role</span>
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const nextRole = e.target.value as HostStaffRole;
                            if (nextRole === "owner") return;
                            saveEdit(
                              member,
                              permissionsForHostStaffRole(nextRole),
                              nextRole
                            );
                          }}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="manager">{HOST_STAFF_ROLE_LABELS.manager}</option>
                          <option value="staff">{HOST_STAFF_ROLE_LABELS.staff}</option>
                        </select>
                      </label>
                    )}
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
                        Owner always has full host access. Change manager/staff permissions above.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
