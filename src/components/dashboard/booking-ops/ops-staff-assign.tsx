"use client";

import { Loader2, UserCog } from "lucide-react";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { useHostStaff } from "@/lib/host/use-host-staff";
import type { HostStaffMember } from "@/lib/host/host-staff-types";

export function OpsStaffAssign({
  hostId,
  assignedStaffId,
  assignedStaffName,
  saving,
  onAssign,
}: {
  hostId: string;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  saving?: boolean;
  onAssign: (staffId: string | null) => Promise<void>;
}) {
  const { staff, ready } = useHostStaff(hostId);
  const activeStaff = staff.filter((member) => member.active);

  async function handleChange(value: string) {
    await onAssign(value ? value : null);
  }

  const currentName =
    assignedStaffName ||
    activeStaff.find((member) => member.id === assignedStaffId)?.name ||
    null;

  return (
    <OpsSectionCard title="Assigned staff">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <UserCog className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {currentName ? `Assigned to ${currentName}` : "No staff assigned"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Assign one team member to own this booking operationally.
            </p>
          </div>
        </div>
        {!ready ? (
          <Loader2 className="w-4 h-4 animate-spin text-green-600 shrink-0" />
        ) : (
          <select
            value={assignedStaffId ?? ""}
            disabled={saving}
            onChange={(e) => void handleChange(e.target.value)}
            className="w-full sm:w-52 h-10 border border-gray-200 rounded-xl px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <option value="">Unassigned</option>
            {activeStaff.map((member: HostStaffMember) => (
              <option key={member.id} value={member.id}>
                {member.name}
                {member.role !== "staff" ? ` (${member.role})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
    </OpsSectionCard>
  );
}
