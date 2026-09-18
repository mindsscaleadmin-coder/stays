import type { Metadata } from "next";
import { HostLayoutWrapper } from "@/components/auth/host-layout-wrapper";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NOINDEX_METADATA;

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <HostLayoutWrapper>{children}</HostLayoutWrapper>;
}
