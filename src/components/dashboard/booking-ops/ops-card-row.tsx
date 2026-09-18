import type { LucideIcon } from "lucide-react";

export function OpsCardRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-start gap-1.5 leading-snug">
        {Icon ? <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" /> : null}
        <span>{value}</span>
      </dd>
    </div>
  );
}
