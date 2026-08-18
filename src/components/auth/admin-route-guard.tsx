"use client";

import { useEffect, type ReactNode } from "react";
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
  const { staff, canAccessPath, homePath } = useAdminStaffAccess();

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      router.push("/admin/login");
      return;
    }
    if (!staff) {
      router.push("/admin/login");
      return;
    }
    if (!canAccessPath(pathname)) {
      router.replace(homePath);
    }
  }, [loading, user, isAdmin, staff, canAccessPath, pathname, homePath, router]);

  // Keep chrome mounted after first auth — full-page spinner on every nav felt broken.
  if (loading && !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!loading && (!user || !isAdmin || !staff)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!user || !isAdmin || !staff) {
    return null;
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
