import type { Metadata } from "next";
import { AdminLayoutWrapper } from "@/components/auth/admin-layout-wrapper";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NOINDEX_METADATA;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
