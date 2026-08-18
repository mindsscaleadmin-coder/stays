import { AdminSettingsShell } from "@/components/dashboard/admin-settings-shell";

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return <AdminSettingsShell>{children}</AdminSettingsShell>;
}
