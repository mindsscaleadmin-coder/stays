import type { ReactNode } from "react";

export function OpsSectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className ?? ""}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}
