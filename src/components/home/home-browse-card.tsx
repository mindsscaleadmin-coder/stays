import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { ReactNode } from "react";

export function HomeBrowseScrollRow({ children }: { children: ReactNode }) {
  return <div className="home-browse-scroll">{children}</div>;
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
    <Link href={href} className="home-browse-card group">
      <div className="home-browse-card-image">
        <Image
          src={img}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="200px"
        />
      </div>
      <div className="pt-2.5 min-w-0">
        <p className="text-[15px] font-semibold text-gray-900 leading-snug truncate">{name}</p>
        <p className="text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>
      </div>
    </Link>
  );
}
