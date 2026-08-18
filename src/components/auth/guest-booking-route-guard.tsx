"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { canBook } from "@/lib/auth/roles";

export function GuestBookingRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !canBook(user.roles))) {
      const next = encodeURIComponent(pathname);
      router.push(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user || !canBook(user.roles)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  return children;
}
