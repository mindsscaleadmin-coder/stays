"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(typeof window !== "undefined" ? window.location.search : "");
  }, [pathname]);

  const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const isActive = (href: string) => {
    const { path, query } = splitHref(href);

    const pathMatches = (candidate: string) =>
      exactHrefs.includes(candidate)
        ? pathname === candidate
        : pathname === candidate || pathname.startsWith(`${candidate}/`);

    if (!pathMatches(path)) return false;

    const allPaths: string[] = [];
    for (const item of navItems) {
      allPaths.push(splitHref(item.href).path);
      item.children?.forEach((child) => allPaths.push(splitHref(child.href).path));
    }
    const matching = allPaths.filter((p) => pathMatches(p));
    const longest = matching.reduce((a, b) => (a.length >= b.length ? a : b), "");
    if (longest !== path) return false;

    const entries = Array.from(query.entries());
    if (entries.length === 0) {
      if (exactHrefs.includes(path) && path === "/account") {
        return !searchParams.get("tab");
      }
      return true;
    }

    return entries.every(([key, value]) => searchParams.get(key) === value);
  };

  const isSectionActive = (item: DashboardNavItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some((child) => isActive(child.href)) ?? false;
  };

  return { isActive, isSectionActive };
}

function SidebarNav({
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
            <div key={item.href} className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [item.href]: !(prev[item.href] ?? sectionActive),
                  }))
                }
                className={cn(
                  "relative flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-colors text-start",
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
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href) &&
                        !item.children?.some((c) => isActive(c.href))
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    {item.overviewLabel ?? "Overview"}
                  </Link>
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
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
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const active = isActive(item.href);
        const Trailing = item.Trailing;
        const showNotice = Boolean(Trailing || item.trailing || item.badge);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer",
              active ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
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
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  </span>
                )}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
            {Trailing ? (
              <Trailing />
            ) : (
              item.trailing ??
              (item.badge ? (
                <span
                  className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
                  aria-label={`${item.badge} new`}
                >
                  {item.badge}
                </span>
              ) : null)
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarChrome({
  title,
  subtitle,
  onClose,
  showClose,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center shadow-sm">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-semibold text-sm text-gray-900 tracking-tight">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>
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
  navItems,
  sidebarExtra,
  exactHrefs = ["/admin", "/host", "/account"],
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gray-100">
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 bg-white border-e border-gray-100",
          "fixed start-0 top-0 z-[80] h-dvh overflow-y-auto"
        )}
        style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}
      >
        <SidebarChrome title={title} subtitle={subtitle} />
        <SidebarNav navItems={navItems} exactHrefs={exactHrefs} />
        {sidebarExtra}
      </aside>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={closeSidebar}
            aria-label="Close overlay"
          />
          <aside
            className="lg:hidden fixed inset-y-0 start-0 z-[80] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col overflow-y-auto"
            style={{ width: DASHBOARD_SIDEBAR_WIDTH_PX }}
          >
            <SidebarChrome
              title={title}
              subtitle={subtitle}
              showClose
              onClose={closeSidebar}
            />
            <SidebarNav
              navItems={navItems}
              exactHrefs={exactHrefs}
              onNavigate={closeSidebar}
            />
            {sidebarExtra}
          </aside>
        </>
      ) : null}

      <div
        id="dashboard-main-column"
        className="min-w-0 lg:ps-[272px]"
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            type="button"
            className="lg:hidden mb-4 flex items-center gap-2 text-sm font-medium text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" /> Menu
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return <DashboardShellInner {...props} />;
}
