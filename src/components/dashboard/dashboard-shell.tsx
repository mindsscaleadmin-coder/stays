"use client";

import { memo, useCallback, useEffect, useMemo, useSyncExternalStore, useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
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
  /** Optional visual treatment for product-specific dashboards. */
  tone?: "default" | "host" | "admin" | "client";
  navItems: DashboardNavItem[];
  sidebarExtra?: ReactNode;
  /** Exact-match roots so /admin doesn't stay active on every admin page */
  exactHrefs?: string[];
  /** Current `tab` query on /account — keeps guest sidebar active state in sync. */
  guestTab?: string | null;
  children: ReactNode;
}

function splitHref(href: string): { path: string; query: URLSearchParams } {
  const [path, qs = ""] = href.split("?");
  return { path, query: new URLSearchParams(qs) };
}

function subscribeLocationSearch(callback: () => void) {
  const notify = () => callback();
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}

/**
 * Active-state without useSearchParams — that hook forces a Suspense boundary
 * which remounted the whole sidebar on every navigation and ate clicks.
 */
function useNavActive(
  navItems: DashboardNavItem[],
  exactHrefs: string[],
  guestTab?: string | null
) {
  const pathname = usePathname();
  const search = useSyncExternalStore(
    subscribeLocationSearch,
    () => (typeof window !== "undefined" ? window.location.search : ""),
    () => ""
  );

  const searchParams = useMemo(() => {
    if (guestTab !== undefined && pathname === "/account") {
      const params = new URLSearchParams();
      if (guestTab) params.set("tab", guestTab);
      return params;
    }
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }, [guestTab, pathname, search]);

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
  clientTabNav = false,
  className,
  children,
}: {
  href: string;
  onNavigate?: () => void;
  clientTabNav?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const plainLeftClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;
    const { path, query } = splitHref(href);

    // Guest /account tabs share one route — router.replace updates search params.
    if (clientTabNav && plainLeftClick && pathname === path) {
      event.preventDefault();
      const search = query.toString();
      const nextHref = search ? `${path}?${search}` : path;
      router.replace(nextHref, { scroll: false });
      onNavigate?.();
      return;
    }
    onNavigate?.();
  }

  return (
    <Link
      href={toIntlHref(href)}
      prefetch={false}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

const SidebarNav = memo(function SidebarNav({
  navItems,
  exactHrefs,
  guestTab,
  onNavigate,
  tone = "default",
}: {
  navItems: DashboardNavItem[];
  exactHrefs: string[];
  guestTab?: string | null;
  onNavigate?: () => void;
  tone?: DashboardShellProps["tone"];
}) {
  const { isActive, isSectionActive } = useNavActive(navItems, exactHrefs, guestTab);
  const clientTabNav = tone === "client";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const hostTone = tone !== "default";

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
                    ? hostTone
                      ? "bg-white/12 text-white ring-1 ring-inset ring-white/10"
                      : "bg-gray-100 text-gray-900"
                    : hostTone
                      ? "text-green-100/80 hover:bg-white/8 hover:text-white"
                      : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {sectionActive && (
                  <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-amber-400" />
                )}
              {Icon && (
                <Icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    sectionActive
                      ? hostTone
                        ? "text-amber-300"
                        : "text-gray-900"
                      : hostTone
                        ? "text-green-200/70"
                        : "text-gray-500"
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
                    "w-4 h-4 transition-transform",
                    hostTone ? "text-green-200/60" : "text-gray-400",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div
                  className={cn(
                    "ms-4 mt-0.5 mb-1 flex flex-col gap-0.5 border-s ps-2",
                    hostTone ? "border-white/10" : "border-gray-100"
                  )}
                >
                  <NavLink
                    href={item.href}
                    onNavigate={onNavigate}
                    clientTabNav={clientTabNav}
                    className={cn(
                      "relative px-3 py-2 rounded-lg text-sm font-medium",
                      isActive(item.href) &&
                        !item.children?.some((c) => isActive(c.href))
                        ? hostTone
                          ? "bg-white/12 text-white"
                          : "bg-gray-100 text-gray-900"
                        : hostTone
                          ? "text-green-100/65 hover:bg-white/8 hover:text-white"
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
                        clientTabNav={clientTabNav}
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium",
                          childActive
                            ? hostTone
                              ? "bg-white/12 text-white"
                              : "bg-gray-100 text-gray-900"
                            : hostTone
                              ? "text-green-100/65 hover:bg-white/8 hover:text-white"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                        )}
                      >
                        {childActive && (
                          <span
                            className={cn(
                              "absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-full",
                              hostTone ? "bg-amber-400" : "bg-green-600"
                            )}
                          />
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
              clientTabNav={clientTabNav}
              className={cn(
                "relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium cursor-pointer",
                active
                  ? hostTone
                    ? "bg-white/12 text-white shadow-sm ring-1 ring-inset ring-white/10"
                    : "bg-gray-100 text-gray-900"
                  : hostTone
                    ? "text-green-100/80 hover:bg-white/8 hover:text-white"
                    : "text-gray-700 hover:bg-gray-50",
                Trailing ? "pe-14" : undefined
              )}
            >
              {active && (
                <span
                  className={cn(
                    "absolute start-0 top-2 bottom-2 w-[3px] rounded-full",
                    hostTone ? "bg-amber-400" : "bg-green-600"
                  )}
                />
              )}
              {Icon && (
                <span className="relative shrink-0">
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px]",
                      active
                        ? hostTone
                          ? "text-amber-300"
                          : "text-gray-900"
                        : hostTone
                          ? "text-green-200/70"
                          : "text-gray-500"
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
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  brandLogo?: string | null;
  onClose?: () => void;
  showClose?: boolean;
  tone?: DashboardShellProps["tone"];
}) {
  const hostTone = tone !== "default";
  return (
    <div
      className={cn(
        "p-5 border-b flex items-center justify-between shrink-0",
        hostTone
          ? "border-white/10 bg-transparent"
          : "border-gray-100"
      )}
    >
      <Link href="/" onClick={onClose} className="flex items-center gap-2.5 min-w-0">
        {brandLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogo}
            alt=""
            className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-200 shadow-sm shrink-0"
          />
        ) : (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0",
              hostTone ? "bg-amber-400" : "bg-green-700"
            )}
          >
            <Leaf className={cn("w-4 h-4", hostTone ? "text-green-950" : "text-white")} />
          </div>
        )}
        <div className="min-w-0">
          <div
            className={cn(
              "font-display font-semibold text-sm tracking-tight truncate",
              hostTone ? "text-white" : "text-gray-900"
            )}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className={cn(
                "text-[11px] mt-0.5 truncate",
                hostTone ? "text-green-100/80" : "text-gray-400"
              )}
            >
              {subtitle}
            </div>
          )}
        </div>
      </Link>
      {showClose && (
        <button
          type="button"
          className={cn(
            "p-1.5 rounded-lg",
            hostTone ? "hover:bg-white/10" : "hover:bg-gray-50"
          )}
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className={cn("w-5 h-5", hostTone ? "text-white" : "text-gray-500")} />
        </button>
      )}
    </div>
  );
}

function DashboardShellInner({
  title,
  subtitle,
  brandLogo,
  tone = "default",
  navItems,
  sidebarExtra,
  exactHrefs = ["/admin", "/host", "/account"],
  guestTab,
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
    <div
      className={cn(
        "min-h-[calc(100vh-120px)] lg:flex lg:items-start",
        tone !== "default" ? "bg-[#f3f7f1]" : "bg-gray-100"
      )}
    >
      <DashboardSidebarColumn
        title={title}
        subtitle={subtitle}
        brandLogo={brandLogo}
        tone={tone}
        navItems={navItems}
        exactHrefs={exactHrefs}
        guestTab={guestTab}
        sidebarExtra={sidebarExtra}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={closeSidebar}
      />
      <DashboardMainColumn onOpenSidebar={openSidebar} tone={tone}>
        {children}
      </DashboardMainColumn>
    </div>
  );
}

const DashboardSidebarColumn = memo(function DashboardSidebarColumn({
  title,
  subtitle,
  brandLogo,
  tone = "default",
  navItems,
  exactHrefs,
  guestTab,
  sidebarExtra,
  sidebarOpen,
  onCloseSidebar,
}: {
  title: string;
  subtitle?: string;
  brandLogo?: string | null;
  tone?: DashboardShellProps["tone"];
  navItems: DashboardNavItem[];
  exactHrefs: string[];
  guestTab?: string | null;
  sidebarExtra?: ReactNode;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}) {
  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-e sticky z-20 overflow-y-auto pointer-events-auto",
          tone !== "default"
            ? "bg-gradient-to-b from-[#123d2d] via-[#174a36] to-[#1b513b] border-green-950/40"
            : "bg-white border-gray-100"
        )}
        style={{
          width: DASHBOARD_SIDEBAR_WIDTH_PX,
          top: "4.5rem",
          height: "calc(100dvh - 4.5rem)",
        }}
      >
        <SidebarChrome title={title} subtitle={subtitle} brandLogo={brandLogo} tone={tone} />
        <SidebarNav
          navItems={navItems}
          exactHrefs={exactHrefs}
          guestTab={guestTab}
          tone={tone}
        />
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
            className={cn(
              "lg:hidden fixed inset-y-0 start-0 z-[100] isolate pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-y-auto pt-[env(safe-area-inset-top)]",
              tone !== "default"
                ? "bg-gradient-to-b from-[#123d2d] via-[#174a36] to-[#1b513b]"
                : "bg-white"
            )}
            style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}
          >
            <SidebarChrome
              title={title}
              subtitle={subtitle}
              brandLogo={brandLogo}
              tone={tone}
              showClose
              onClose={onCloseSidebar}
            />
            <SidebarNav
              navItems={navItems}
              exactHrefs={exactHrefs}
              guestTab={guestTab}
              onNavigate={onCloseSidebar}
              tone={tone}
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
  tone = "default",
}: {
  children: ReactNode;
  onOpenSidebar: () => void;
  tone?: DashboardShellProps["tone"];
}) {
  return (
    <div id="dashboard-main-column" className="min-w-0 flex-1">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <button
          type="button"
          className={cn(
            "lg:hidden mb-4 items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border",
            "flex",
            tone !== "default"
              ? "border-green-200 bg-white text-green-800 shadow-sm"
              : "border-transparent text-gray-600"
          )}
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
