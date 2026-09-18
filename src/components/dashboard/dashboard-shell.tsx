"use client";

import { memo, useCallback, useEffect, useMemo, useSyncExternalStore, useState, type ComponentType, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { ChevronDown, Leaf, Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_SIDEBAR_WIDTH_PX } from "@/lib/layout/dashboard-chrome";

export interface DashboardNavItem {
  label: string;
  href: string;
  badge?: string;
  /** Renders a fresh instance per sidebar (desktop/mobile). Prefer over `trailing`. */
  Trailing?: ComponentType;
  /** @deprecated Prefer `Trailing` — a single element cannot mount in two sidebars. */
  trailing?: ReactNode;
  icon?: LucideIcon;
  children?: DashboardNavItem[];
  /** Label for the parent href link when this item has children (default: Overview) */
  overviewLabel?: string;
}

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  /** Host / company brand mark for the sidebar header */
  brandLogo?: string | null;
  navItems: DashboardNavItem[];
  sidebarExtra?: ReactNode;
  /** Exact-match roots so /admin doesn't stay active on every admin page */
  exactHrefs?: string[];
  children: ReactNode;
}

function splitHref(href: string): { path: string; query: URLSearchParams } {
  const [path, qs = ""] = href.split("?");
  return { path, query: new URLSearchParams(qs) };
}

/**
 * Active-state without useSearchParams — that hook forces a Suspense boundary
 * which remounted the whole sidebar on every navigation and ate clicks.
 */
function useNavActive(navItems: DashboardNavItem[], exactHrefs: string[]) {
  const pathname = usePathname();
  const search = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.search : ""),
    () => ""
  );

  const searchParams = useMemo(
    () => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );

  const exactSet = useMemo(() => new Set(exactHrefs), [exactHrefs]);

  const allPaths = useMemo(() => {
    const paths: string[] = [];
    for (const item of navItems) {
      paths.push(splitHref(item.href).path);
      item.children?.forEach((child) => paths.push(splitHref(child.href).path));
    }
    return paths;
  }, [navItems]);

  const pathMatches = useCallback(
    (candidate: string) =>
      exactSet.has(candidate)
        ? pathname === candidate
        : pathname === candidate || pathname.startsWith(`${candidate}/`),
    [pathname, exactSet]
  );

  const longestActivePath = useMemo(() => {
    const matching = allPaths.filter((p) => pathMatches(p));
    return matching.reduce((a, b) => (a.length >= b.length ? a : b), "");
  }, [allPaths, pathMatches]);

  const isActive = useCallback(
    (href: string) => {
      const { path, query } = splitHref(href);

      if (!pathMatches(path)) return false;
      if (longestActivePath !== path) return false;

      const entries = Array.from(query.entries());
      if (entries.length === 0) {
        if (exactSet.has(path) && path === "/account") {
          return !searchParams.get("tab");
        }
        return true;
      }

      return entries.every(([key, value]) => searchParams.get(key) === value);
    },
    [pathMatches, longestActivePath, searchParams, exactSet]
  );

  const isSectionActive = useCallback(
    (item: DashboardNavItem) => {
      if (isActive(item.href)) return true;
      return item.children?.some((child) => isActive(child.href)) ?? false;
    },
    [isActive]
  );

  return { isActive, isSectionActive };
}

function toIntlHref(href: string) {
  const { path, query } = splitHref(href);
  const entries = Array.from(query.entries());
  if (entries.length === 0) return path;
  return { pathname: path, query: Object.fromEntries(entries) };
}

function NavLink({
  href,
  onNavigate,
  className,
  children,
}: {
  href: string;
  onNavigate?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={toIntlHref(href)}
      prefetch={false}
      className={className}
      onClick={() => onNavigate?.()}
    >
      {children}
    </Link>
  );
}

const SidebarNav = memo(function SidebarNav({
  navItems,
  exactHrefs,
  onNavigate,
}: {
  navItems: DashboardNavItem[];
  exactHrefs: string[];
  onNavigate?: () => void;
}) {
  const { isActive, isSectionActive } = useNavActive(navItems, exactHrefs);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <nav className="p-3 flex flex-col gap-0.5 relative z-10">
      {navItems.map((item) => {
        const Icon = item.icon;
        const sectionActive = isSectionActive(item);
        const hasChildren = Boolean(item.children?.length);
        const isOpen = expanded[item.href] ?? sectionActive;

        if (hasChildren) {
          return (
            <div key={`${item.href}-${item.label}`} className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [item.href]: !(prev[item.href] ?? sectionActive),
                  }))
                }
                className={cn(
                  "relative flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium text-start",
                  sectionActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {sectionActive && (
                  <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-green-600" />
                )}
              {Icon && (
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    sectionActive ? "text-gray-900" : "text-gray-500"
                  )}
                  strokeWidth={1.75}
                />
              )}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className="inline-flex items-center justify-center min-w-[1.25rem] bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    aria-label={`${item.badge} new`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="ms-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-s border-gray-100 ps-2">
                  <NavLink
                    href={item.href}
                    onNavigate={onNavigate}
                    className={cn(
                      "relative px-3 py-2 rounded-lg text-sm font-medium",
                      isActive(item.href) &&
                        !item.children?.some((c) => isActive(c.href))
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    {item.overviewLabel ?? "Overview"}
                  </NavLink>
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isActive(child.href);
                    return (
                      <NavLink
                        key={child.href}
                        href={child.href}
                        onNavigate={onNavigate}
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium",
                          childActive
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                        )}
                      >
                        {childActive && (
                          <span className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-green-600" />
                        )}
                        {ChildIcon && (
                          <ChildIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                        )}
                        <span className="flex-1">{child.label}</span>
                        {child.badge && (
                          <span
                            className="inline-flex items-center justify-center min-w-[1.25rem] bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            aria-label={`${child.badge} new`}
                          >
                            {child.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = isActive(item.href);
        const Trailing = item.Trailing;
        const showNotice = Boolean(item.trailing || item.badge);

        return (
          <div key={`${item.href}-${item.label}`} className="relative">
            <NavLink
              href={item.href}
              onNavigate={onNavigate}
              className={cn(
                "relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium cursor-pointer",
                active ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50",
                Trailing ? "pe-14" : undefined
              )}
            >
              {active && (
                <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-green-600" />
              )}
              {Icon && (
                <span className="relative shrink-0">
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px]",
                      active ? "text-gray-900" : "text-gray-500"
                    )}
                    strokeWidth={1.75}
                  />
                  {showNotice && (
                    <span className="absolute -top-1 -end-1 flex h-2.5 w-2.5" aria-hidden>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    </span>
                  )}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {!Trailing &&
                (item.trailing ??
                  (item.badge ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
                      aria-label={`${item.badge} new`}
                    >
                      {item.badge}
                    </span>
                  ) : null))}
            </NavLink>
            {Trailing ? (
              <div className="absolute end-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Trailing />
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
});

function SidebarChrome({
  title,
  subtitle,
  brandLogo,
  onClose,
  showClose,
}: {
  title: string;
  subtitle?: string;
  brandLogo?: string | null;
  onClose?: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
      <Link href="/" onClick={onClose} className="flex items-center gap-2.5 min-w-0">
        {brandLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogo}
            alt=""
            className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-200 shadow-sm shrink-0"
          />
        ) : (
          <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Leaf className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-display font-semibold text-sm text-gray-900 tracking-tight truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</div>}
        </div>
      </Link>
      {showClose && (
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-gray-50"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
}

function DashboardShellInner({
  title,
  subtitle,
  brandLogo,
  navItems,
  sidebarExtra,
  exactHrefs = ["/admin", "/host", "/account"],
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gray-100 lg:flex lg:items-start">
      <DashboardSidebarColumn
        pathname={pathname}
        title={title}
        subtitle={subtitle}
        brandLogo={brandLogo}
        navItems={navItems}
        exactHrefs={exactHrefs}
        sidebarExtra={sidebarExtra}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={closeSidebar}
      />
      <DashboardMainColumn onOpenSidebar={openSidebar}>
        {children}
      </DashboardMainColumn>
    </div>
  );
}

const DashboardSidebarColumn = memo(function DashboardSidebarColumn({
  pathname: _pathname,
  title,
  subtitle,
  brandLogo,
  navItems,
  exactHrefs,
  sidebarExtra,
  sidebarOpen,
  onCloseSidebar,
}: {
  pathname: string;
  title: string;
  subtitle?: string;
  brandLogo?: string | null;
  navItems: DashboardNavItem[];
  exactHrefs: string[];
  sidebarExtra?: ReactNode;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}) {
  return (
    <>
      <aside
        className="hidden lg:flex flex-col shrink-0 bg-white border-e border-gray-100 sticky z-20 overflow-y-auto pointer-events-auto"
        style={{
          width: DASHBOARD_SIDEBAR_WIDTH_PX,
          top: "4.5rem",
          height: "calc(100dvh - 4.5rem)",
        }}
      >
        <SidebarChrome title={title} subtitle={subtitle} brandLogo={brandLogo} />
        <SidebarNav navItems={navItems} exactHrefs={exactHrefs} />
        {sidebarExtra}
      </aside>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onCloseSidebar}
            aria-label="Close overlay"
          />
          <aside
            className="lg:hidden fixed inset-y-0 start-0 z-[100] isolate pointer-events-auto bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-y-auto pt-[env(safe-area-inset-top)]"
            style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}
          >
            <SidebarChrome
              title={title}
              subtitle={subtitle}
              brandLogo={brandLogo}
              showClose
              onClose={onCloseSidebar}
            />
            <SidebarNav
              navItems={navItems}
              exactHrefs={exactHrefs}
              onNavigate={onCloseSidebar}
            />
            {sidebarExtra}
          </aside>
        </>
      ) : null}
    </>
  );
});

const DashboardMainColumn = memo(function DashboardMainColumn({
  children,
  onOpenSidebar,
}: {
  children: ReactNode;
  onOpenSidebar: () => void;
}) {
  return (
    <div id="dashboard-main-column" className="min-w-0 flex-1">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <button
          type="button"
          className="lg:hidden mb-4 flex items-center gap-2 text-sm font-medium text-gray-600"
          onClick={onOpenSidebar}
        >
          <Menu className="w-5 h-5" /> Menu
        </button>
        {children}
      </div>
    </div>
  );
});

export function DashboardShell(props: DashboardShellProps) {
  return <DashboardShellInner {...props} />;
}

export { DashboardSidebarColumn, DashboardMainColumn };
