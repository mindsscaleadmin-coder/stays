import { AdminLayoutWrapper } from "@/components/auth/admin-layout-wrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
