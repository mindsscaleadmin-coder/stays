import {
  CalendarDays,
  Clock,
  Home,
  Moon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { OpsStatusBadge } from "@/components/dashboard/booking-ops/ops-status-badge";
import {
  bookingCategoryForRecord,
  hostBookingCategoryLabel,
} from "@/lib/host/booking-category";
import { isEventOpsRecord } from "@/lib/host/host-ops-adapter";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { formatBookingDate } from "@/lib/booking/display";
import { cn } from "@/lib/utils";

function guestInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "G"
  );
}

function paymentStatusStyles(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  if (s.includes("refund")) return "bg-amber-50 text-amber-900 ring-amber-200/80";
  if (s === "unpaid") return "bg-orange-50 text-orange-900 ring-orange-200/80";
  return "bg-gray-50 text-gray-700 ring-gray-200/80";
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-gray-900 mt-1 leading-snug tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function OpsDetailHeader({ booking }: { booking: HostBookingRecord }) {
  const category = bookingCategoryForRecord(booking);
  const categoryLabel = hostBookingCategoryLabel(category);
  const isExperience = category === "experience";
  const isEnquiry = isEventOpsRecord(booking);
  const ref = booking.bookingReference || booking.id;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm print:hidden">
      <div className="border-b border-gray-100 bg-gray-50/70 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
            {isEnquiry ? "Enquiry" : "Booking"}
          </span>
          <span className="text-gray-300" aria-hidden>·</span>
          <span className="font-mono text-xs font-semibold text-gray-700 tracking-tight">{ref}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600"
          >
            {categoryLabel}
          </span>
        </div>
        <OpsStatusBadge booking={booking} />
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-11 h-11 rounded-xl bg-[var(--brand-green)] text-white flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm"
              aria-hidden
            >
              {guestInitials(booking.guest)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 font-display tracking-tight leading-tight">
                {booking.guest}
              </h1>
              <p className="text-sm font-medium text-gray-600 flex items-center gap-1.5 mt-1">
                <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{booking.property}</span>
              </p>
              {booking.propertyLocation ? (
                <p className="hidden sm:block text-xs text-gray-500 truncate mt-0.5">{booking.propertyLocation}</p>
              ) : null}
              {booking.roomType && booking.roomType !== "Entire place" ? (
                <p className="hidden sm:block text-xs text-gray-500 mt-0.5">{booking.roomType}</p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1">
              Amount
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums tracking-tight leading-none">
              {booking.total}
            </p>
            <span
              className={cn(
                "inline-flex mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset",
                paymentStatusStyles(booking.paymentStatus)
              )}
            >
              {booking.paymentStatus}
            </span>
          </div>
        </div>

        <div className="mt-4 -mx-4 -mb-4 sm:-mx-5 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100 border-t border-gray-100 bg-gray-50/40">
          {isEnquiry ? (
            <>
              <HeroStat
                icon={CalendarDays}
                label="Event date"
                value={booking.dateFlexible ? "Flexible" : formatBookingDate(booking.checkIn)}
              />
              <HeroStat icon={Users} label="Guests" value={String(booking.guests)} />
              <HeroStat
                icon={Clock}
                label="Occasion"
                value={booking.eventOccasion || booking.eventPartyType || "—"}
              />
              <HeroStat icon={Clock} label="Type" value="Enquiry" />
            </>
          ) : isExperience ? (
            <>
              <HeroStat icon={CalendarDays} label="Date" value={formatBookingDate(booking.checkIn)} />
              <HeroStat
                icon={Clock}
                label="Session"
                value={booking.experienceSessionLabel || "—"}
              />
              <HeroStat icon={Users} label="Participants" value={String(booking.guests)} />
              <HeroStat icon={Clock} label="Duration" value="1 session" />
            </>
          ) : (
            <>
              <HeroStat
                icon={CalendarDays}
                label="Check-in"
                value={formatBookingDate(booking.checkIn)}
              />
              <HeroStat
                icon={CalendarDays}
                label="Check-out"
                value={formatBookingDate(booking.checkOut)}
              />
              <HeroStat icon={Users} label="Guests" value={String(booking.guests)} />
              <HeroStat icon={Moon} label="Nights" value={String(booking.nights)} />
            </>
          )}
        </div>

        {booking.status === "expired" ? (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 leading-relaxed">
            This booking expired before it could be completed.
          </p>
        ) : null}
      </div>
    </section>
  );
}
