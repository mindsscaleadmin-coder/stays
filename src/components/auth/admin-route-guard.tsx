"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/forgot-password",
  "/admin/reset-password",
];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.endsWith(path)
  );
}

function AdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isAdmin } = useAuth();
  const { staff, ready, canAccessPath, homePath } = useAdminStaffAccess();
  const unlocked = useRef(false);
  if (user && isAdmin && staff) unlocked.current = true;

  useEffect(() => {
    if (loading || !ready) return;
    if (!user || !isAdmin) {
      if (pathname !== "/admin/login") router.replace("/admin/login");
      return;
    }
    if (!staff) {
      if (pathname !== "/admin/login") router.replace("/admin/login");
      return;
    }
    if (!canAccessPath(pathname) && pathname !== homePath) {
      router.replace(homePath);
    }
  }, [loading, ready, user, isAdmin, staff, canAccessPath, pathname, homePath, router]);

  if (unlocked.current) {
    return children;
  }

  if (loading || !ready || !user || !isAdmin || !staff) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!canAccessPath(pathname)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return children;
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicAdminPath(pathname)) {
    return children;
  }

  return <AdminAuthGate>{children}</AdminAuthGate>;
}
