"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";
import { HOST_CATEGORY_NAV_GROUPS } from "@/lib/host/host-category-nav";
import { HostCategoryFlowLegend } from "@/components/dashboard/host-ops-flow-banner";
import { useHostStaffAccess } from "@/lib/host/use-host-staff-access";
import { cn } from "@/lib/utils";

function splitPath(href: string) {
  const [path, query = ""] = href.split("?");
  return { path, category: new URLSearchParams(query).get("category") };
}

function isLinkActive(pathname: string, href: string, activeCategory: string | null) {
  const { path, category } = splitPath(href);
  const onTargetPath = pathname === path || pathname.startsWith(`${path}/`);
  return onTargetPath && activeCategory === category;
}

export function HostCategorySidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const { canAccessPath } = useHostStaffAccess();

  const groups = useMemo(
    () =>
      HOST_CATEGORY_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessPath(item.href.split("?")[0])),
      })).filter((group) => group.items.length > 0),
    [canAccessPath]
  );

  if (groups.length === 0) return null;

  return (
    <div className="px-3 pb-4 mt-1 border-t border-gray-100 pt-3 space-y-4">
      <div className="px-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
          By category
        </p>
        <p className="text-[10px] text-gray-400 mt-1 leading-snug">
          Paid stays & experiences → Bookings. Events & dining → Enquiries first.
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.kind}>
          <div className="px-3.5 mb-1.5 flex items-center gap-2">
            <HostCategoryFlowLegend kind={group.kind} />
            <span className="text-[10px] font-semibold text-gray-500">{group.label}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const primaryActive = isLinkActive(pathname, item.href, activeCategory);
              const secondaryActive =
                item.secondaryHref &&
                isLinkActive(pathname, item.secondaryHref, activeCategory);
              const Icon = item.icon;

              return (
                <div key={item.id} className="px-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      primaryActive
                        ? "bg-green-50 text-green-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {primaryActive && (
                      <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-green-600" />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        primaryActive ? "text-green-700" : "text-gray-400"
                      )}
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span className="block text-[10px] font-normal text-gray-400 truncate">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                  {item.secondaryHref && item.secondaryLabel ? (
                    <Link
                      href={item.secondaryHref}
                      className={cn(
                        "ms-9 mt-0.5 mb-1 inline-flex text-[10px] font-semibold px-2 py-1 rounded-md transition-colors",
                        secondaryActive
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      )}
                    >
                      {item.secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
