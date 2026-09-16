/** Non-interactive map preview for guest listing pages. */
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
    <div className={`relative ${className ?? ""}`} role="img" aria-label={title}>
      <iframe
        title={title}
        src={src}
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
      />
      <div className="absolute inset-0 cursor-default" aria-hidden="true" />
    </div>
  );
}
