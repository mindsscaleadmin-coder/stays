"use client";

import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminStaffAccessPanel } from "./admin-staff-access-panel";

/** @deprecated Use Users & Access → Staff tab. Kept for any leftover imports. */
export function AdminRolesContent() {
  return (
    <AdminDashboardShell>
      <AdminStaffAccessPanel />
    </AdminDashboardShell>
  );
}
