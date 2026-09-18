import type { ReactNode } from "react";

export function OpsSectionCard({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`bg-white rounded-2xl border border-gray-200/90 p-4 shadow-sm ${className ?? ""}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
