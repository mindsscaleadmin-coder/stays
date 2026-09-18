import { cn } from "@/lib/utils";

export interface CrmStatItem {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "green" | "amber" | "purple" | "blue";
  active?: boolean;
  onClick?: () => void;
}

const toneDot: Record<NonNullable<CrmStatItem["tone"]>, string> = {
  default: "bg-gray-400",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-violet-500",
  blue: "bg-blue-500",
};

export function CrmStatsBar({
  items,
  embedded = false,
}: {
  items: CrmStatItem[];
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5",
        !embedded && "rounded-2xl border border-gray-200/90 bg-white p-2 shadow-sm"
      )}
    >
      {items.map((item) => {
        const interactive = Boolean(item.onClick);
        const tone = item.tone ?? "default";

        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            disabled={!interactive}
            className={cn(
              "group relative flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left transition-all",
              item.active
                ? "bg-[var(--brand-green)]/[0.09] text-[var(--brand-green-dark)] ring-1 ring-[var(--brand-green)]/20 shadow-xs"
                : "bg-gray-50/70 hover:bg-gray-100/70 text-gray-700",
              interactive ? "cursor-pointer" : "cursor-default"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", toneDot[tone])} />
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {item.label}
                </p>
              </div>
              {item.hint ? (
                <p className="truncate text-[11px] text-gray-400 mt-0.5">{item.hint}</p>
              ) : null}
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums tracking-tight shrink-0">
              {item.value}
            </p>
          </button>
        );
      })}
    </div>
  );
}
