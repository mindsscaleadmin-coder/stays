import { Link } from "@/i18n/routing";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CrmQuickLink {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export function CrmQuickLinks({ links }: { links: CrmQuickLink[] }) {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 px-1 mb-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
          Quick actions
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex min-w-0 items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5",
              "hover:border-[var(--brand-green)]/25 hover:bg-white hover:shadow-sm transition-all"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-[var(--brand-green)]/20">
              <link.icon className="w-3.5 h-3.5 text-[var(--brand-green)]" />
            </div>
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800 group-hover:text-[var(--brand-green-dark)]">
              {link.label}
            </p>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-300 group-hover:text-[var(--brand-green)] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
