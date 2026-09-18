import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CrmPageHeader({
  title,
  actions,
  summary,
  className,
}: {
  title: string;
  actions?: ReactNode;
  summary?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-gray-200/90 bg-white p-2 sm:p-2.5 shadow-sm",
        className
      )}
    >
      <h1 className="sr-only">{title}</h1>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {summary ? <div className="min-w-0 flex-1">{summary}</div> : null}
        {actions ? (
          <div className="flex items-center gap-2 shrink-0 px-1">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
