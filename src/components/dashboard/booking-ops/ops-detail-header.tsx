import { CalendarDays, Clock, User, type LucideIcon } from "lucide-react";
import { OpsStatusBadge } from "@/components/dashboard/booking-ops/ops-status-badge";
import {
  bookingCategoryForRecord,
  hostBookingCategoryLabel,
} from "@/lib/host/booking-category";
import { isEventOpsRecord } from "@/lib/host/host-ops-adapter";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { formatBookingDate } from "@/lib/mock/dashboard-data";

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
    <div className="rounded-xl border border-gray-100 bg-white/70 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export function OpsDetailHeader({ booking }: { booking: HostBookingRecord }) {
  const category = bookingCategoryForRecord(booking);
  const categoryLabel = hostBookingCategoryLabel(category);
  const isExperience = category === "experience";
  const isEnquiry = isEventOpsRecord(booking);

  return (
    <section className="rounded-2xl border overflow-hidden print:hidden border-gray-200 bg-white">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl bg-[var(--brand-green)] text-white flex items-center justify-center text-lg font-bold shrink-0"
              aria-hidden
            >
              {booking.guest
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") || "G"}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-green)]">
                {categoryLabel}
              </p>
              <h1 className="text-2xl font-bold text-gray-900 font-display mt-0.5 tracking-tight">
                {isEnquiry ? "Enquiry" : "Booking"} #{booking.bookingReference || booking.id}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{booking.guest}</p>
              <p className="text-sm text-gray-500">{booking.property}</p>
            </div>
          </div>
          <div className="text-end">
            <OpsStatusBadge booking={booking} />
            <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums">{booking.total}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {booking.paymentStatus}
              {booking.currency ? ` · ${booking.currency}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isEnquiry ? (
            <>
              <HeroStat
                icon={CalendarDays}
                label="Event date"
                value={booking.dateFlexible ? "Flexible" : formatBookingDate(booking.checkIn)}
              />
              <HeroStat icon={User} label="Guests" value={`${booking.guests}`} />
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
              <HeroStat icon={User} label="Participants" value={`${booking.guests}`} />
              <HeroStat icon={Clock} label="Duration" value="1 session" />
            </>
          ) : (
            <>
              <HeroStat icon={CalendarDays} label="Check-in" value={formatBookingDate(booking.checkIn)} />
              <HeroStat icon={CalendarDays} label="Check-out" value={formatBookingDate(booking.checkOut)} />
              <HeroStat icon={User} label="Guests" value={`${booking.guests}`} />
              <HeroStat icon={Clock} label="Nights" value={`${booking.nights}`} />
            </>
          )}
        </div>

        {booking.status === "expired" && (
          <p className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            This booking expired before it could be completed.
          </p>
        )}
      </div>
    </section>
  );
}
