import type { VenueCapacityLayout } from "@/lib/listings/event-space-display";

function CapacityIcon({ id }: { id: VenueCapacityLayout["id"] }) {
  const green = "#22c55e";
  const muted = "#d1d5db";

  if (id === "standing") {
    return (
      <svg viewBox="0 0 56 40" className="h-10 w-14 shrink-0" aria-hidden>
        <rect
          x="8"
          y="8"
          width="40"
          height="24"
          rx="2"
          fill="none"
          stroke={muted}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
    );
  }

  if (id === "dining") {
    return (
      <svg viewBox="0 0 56 40" className="h-10 w-14 shrink-0" aria-hidden>
        <circle cx="28" cy="20" r="9" fill={muted} />
        {Array.from({ length: 10 }).map((_, index) => {
          const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
          const x = 28 + Math.cos(angle) * 17;
          const y = 20 + Math.sin(angle) * 17;
          return <circle key={index} cx={x} cy={y} r="2.2" fill={green} />;
        })}
      </svg>
    );
  }

  if (id === "theatre") {
    return (
      <svg viewBox="0 0 56 40" className="h-10 w-14 shrink-0" aria-hidden>
        <rect x="6" y="10" width="8" height="20" rx="1.5" fill={muted} />
        {Array.from({ length: 18 }).map((_, index) => {
          const row = Math.floor(index / 6);
          const col = index % 6;
          return (
            <circle
              key={index}
              cx={18 + col * 6}
              cy={12 + row * 7}
              r="2"
              fill={green}
            />
          );
        })}
      </svg>
    );
  }

  if (id === "cabaret") {
    return (
      <svg viewBox="0 0 56 40" className="h-10 w-14 shrink-0" aria-hidden>
        {[14, 42].map((centerX) => (
          <g key={centerX}>
            <path
              d={`M ${centerX - 8} 24 A 8 8 0 0 1 ${centerX + 8} 24`}
              fill={muted}
            />
            {Array.from({ length: 5 }).map((_, index) => {
              const angle = Math.PI + (index / 4) * Math.PI;
              const x = centerX + Math.cos(angle) * 12;
              const y = 24 + Math.sin(angle) * 8;
              return <circle key={index} cx={x} cy={y} r="2" fill={green} />;
            })}
          </g>
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 40" className="h-10 w-14 shrink-0" aria-hidden>
      {[16, 28, 40].map((x) => (
        <g key={x}>
          <rect x={x - 1} y="10" width="2" height="20" rx="1" fill={muted} />
          {Array.from({ length: 3 }).map((_, index) => (
            <circle key={index} cx={x - 5} cy={14 + index * 7} r="2" fill={green} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function EventSpaceCapacitySection({ layouts }: { layouts: VenueCapacityLayout[] }) {
  if (layouts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start sm:gap-6">
      <h3 className="font-display text-sm font-bold text-gray-900">Capacity</h3>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {layouts.map((layout) => (
          <div key={layout.id} className="flex items-center gap-3">
            <CapacityIcon id={layout.id} />
            <div className="min-w-0 text-sm text-gray-700">
              <span className="font-medium text-gray-800">{layout.label}</span>
              <span className="text-gray-600">
                {" "}
                up to{" "}
                <strong className="font-bold text-gray-950">
                  {layout.value.toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
