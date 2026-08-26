import type { ReactNode } from "react";

export function SiteInfoPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-gray-900 font-display">{title}</h1>
      {subtitle ? <p className="mt-2 text-gray-500">{subtitle}</p> : null}
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}
