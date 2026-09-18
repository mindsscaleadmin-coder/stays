import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrmEmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto ring-1 ring-gray-100">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-base font-semibold text-gray-900 mt-5 tracking-tight">{title}</p>
      {description ? (
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
