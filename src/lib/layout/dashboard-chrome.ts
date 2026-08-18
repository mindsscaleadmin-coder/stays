/** Paths that render DashboardShell (sidebar chrome). */
const AUTH_PUBLIC_PREFIXES = [
  "/admin/login",
  "/admin/signup",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/host/login",
  "/host/signup",
];

export const DASHBOARD_SIDEBAR_WIDTH_PX = 272;

/**
 * True when the marketing header should sit beside the dashboard sidebar
 * instead of spanning full width over it.
 */
export function isDashboardChromePath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "";
  if (AUTH_PUBLIC_PREFIXES.some((p) => path === p || path.endsWith(p))) {
    return false;
  }
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/host" ||
    path.startsWith("/host/") ||
    path === "/account" ||
    path.startsWith("/account/")
  );
}
