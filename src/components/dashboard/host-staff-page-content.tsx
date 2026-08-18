"use client";

import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { HostStaffAccessPanel } from "@/components/dashboard/host-staff-content";

export function HostStaffPageContent() {
  return (
    <HostDashboardShell>
      <HostStaffAccessPanel />
    </HostDashboardShell>
  );
}
