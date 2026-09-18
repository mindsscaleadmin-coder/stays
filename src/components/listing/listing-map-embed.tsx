/** Non-interactive map preview for guest listing pages (demo only — not draggable or clickable). */
export function ListingMapEmbed({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`relative select-none touch-none ${className ?? ""}`}
      role="img"
      aria-label={title}
    >
      <iframe
        title={title}
        src={src}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-10 cursor-default"
        aria-hidden="true"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
