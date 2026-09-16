import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function HomeBrowseScrollRow({ children }: { children: ReactNode }) {
  return <div className="home-carousel-row items-stretch">{children}</div>;
}

export function HomeBrowseSectionHeader({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  subtitle: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-gray-900 font-display sm:text-xl">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
      <Link
        href={viewAllHref}
        className="flex shrink-0 items-center gap-1 text-sm font-semibold text-green-700"
      >
        {viewAllLabel} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function HomeBrowseCard({
  href,
  name,
  subtitle,
  img,
}: {
  href: string;
  name: string;
  subtitle: string;
  img: string;
}) {
  return (
    <Link
      href={href}
      className="home-carousel-item home-browse-card group flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200/80 hover:shadow-md"
    >
      <div className="relative aspect-[20/19] overflow-hidden bg-gray-100">
        <Image
          src={img}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 743px) 50vw, (max-width: 1279px) 17vw, 14vw"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="min-w-0 p-2.5">
        <p className="text-[13px] font-semibold leading-tight text-gray-900 line-clamp-1">{name}</p>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{subtitle}</p>
      </div>
    </Link>
  );
}
