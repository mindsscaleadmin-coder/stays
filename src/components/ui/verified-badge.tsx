import Image from "next/image";
import { cn } from "@/lib/utils";

/** Listing title uses lg = 28×28; sm/md for compact UI chips. */
const SIZE_MAP = {
  sm: { px: 14, className: "size-3.5 w-3.5 h-3.5" },
  md: { px: 20, className: "size-5 w-5 h-5" },
  lg: { px: 28, className: "size-7 w-7 h-7" },
} as const;

export function VerifiedBadge({
  size = "md",
  className,
  alt = "Verified",
}: {
  size?: keyof typeof SIZE_MAP;
  className?: string;
  alt?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <Image
      src="/icons/verified-badge.png"
      alt={alt}
      width={s.px}
      height={s.px}
      className={cn(s.className, "shrink-0 object-contain", className)}
    />
  );
}
