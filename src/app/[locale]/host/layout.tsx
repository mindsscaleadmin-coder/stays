import { HostLayoutWrapper } from "@/components/auth/host-layout-wrapper";

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return <HostLayoutWrapper>{children}</HostLayoutWrapper>;
}
