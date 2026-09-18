import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NOINDEX_METADATA;

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
