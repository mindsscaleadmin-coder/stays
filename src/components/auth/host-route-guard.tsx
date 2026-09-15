"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { canManageListings } from "@/lib/auth/roles";

const PUBLIC_HOST_PATHS = ["/host/login", "/host/signup"];

function isPublicHostPath(pathname: string): boolean {
  return PUBLIC_HOST_PATHS.some(
    (path) => pathname === path || pathname.endsWith(path)
  );
}

function HostAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isHostAccountRestricted, impersonating, stopImpersonating } =
    useAuth();
  const wasHostRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user && canManageListings(user.roles)) {
      wasHostRef.current = true;
      return;
    }
    wasHostRef.current = false;
    const next = encodeURIComponent(pathname);
    if (user) {
      router.push(`/host/signup?next=${next}`);
      return;
    }
    router.push(`/host/login?next=${next}`);
  }, [loading, user, router, pathname]);

  if (!user || !canManageListings(user.roles)) {
    if (loading && wasHostRef.current) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (isHostAccountRestricted && !impersonating) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl p-6 max-w-md text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Account restricted</h2>
          <p className="text-sm text-gray-500">
            This host account is suspended or banned. Contact platform support if you believe
            this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {impersonating && (
        <div className="bg-amber-500 text-white text-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span>
            Viewing as host <strong>{user.fullName}</strong> (impersonation mode)
          </span>
          <button
            type="button"
            onClick={() => {
              stopImpersonating();
              router.push("/admin/hosts");
            }}
            className="font-semibold underline underline-offset-2 shrink-0"
          >
            Exit to admin
          </button>
        </div>
      )}
      {children}
    </>
  );
}

export function HostRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicHostPath(pathname)) {
    return children;
  }

  return <HostAuthGate>{children}</HostAuthGate>;
}
