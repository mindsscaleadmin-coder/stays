import { Link } from "@/i18n/routing";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  Moon,
  UserCog,
  Users,
} from "lucide-react";
import { OpsStatusBadge } from "@/components/dashboard/booking-ops/ops-status-badge";
import { bookingCategoryForRecord, hostBookingCategoryLabel } from "@/lib/host/booking-category";
import { isEventOpsRecord, hostBookingDetailPath } from "@/lib/host/host-ops-adapter";
import { displaySpecialRequests } from "@/lib/host/host-booking-utils";
import { resolveBookingOperationalStatus } from "@/lib/host/host-booking-list-utils";
import { formatBookingDate } from "@/lib/booking/display";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { OperationalStatus } from "@/lib/host/host-ops-types";
import { attentionReason, guestInitials } from "@/lib/host/crm-utils";
import { cn } from "@/lib/utils";

const ACCENT: Record<OperationalStatus, string> = {
  confirmed: "bg-emerald-400",
  upcoming: "bg-blue-400",
  in_progress: "bg-amber-400",
  completed: "bg-gray-300",
  cancelled: "bg-red-400",
};

function formatDateRange(booking: HostBookingRecord): string {
  const category = bookingCategoryForRecord(booking);
  if (isEventOpsRecord(booking)) {
    return booking.dateFlexible ? "Flexible date" : formatBookingDate(booking.checkIn);
  }
  if (category === "experience") {
    return formatBookingDate(booking.checkIn);
  }
  return `${formatBookingDate(booking.checkIn)} → ${formatBookingDate(booking.checkOut)}`;
}

export function CrmBookingCard({
  booking,
  highlighted,
}: {
  booking: HostBookingRecord;
  highlighted?: boolean;
}) {
  const special = displaySpecialRequests(booking);
  const attention = attentionReason(booking);
  const category = hostBookingCategoryLabel(bookingCategoryForRecord(booking));
  const opsStatus = resolveBookingOperationalStatus(booking);
  const isPaid = booking.paymentStatus?.toLowerCase() === "paid";
  const isStay = bookingCategoryForRecord(booking) === "stay";
  const detailPath = hostBookingDetailPath(booking);

  return (
    <article
      className={cn(
        "group relative flex bg-white border rounded-2xl overflow-hidden transition-all",
        highlighted
          ? "border-[var(--brand-green)]/40 ring-2 ring-[var(--brand-green)]/15 shadow-md"
          : "border-gray-200/80 shadow-xs hover:border-gray-300 hover:shadow-md"
      )}
    >
      {/* Status accent rail */}
      <span className={cn("w-1 shrink-0", ACCENT[opsStatus])} aria-hidden />

      <div className="flex-1 min-w-0 p-3.5 sm:p-4">
        <div className="flex items-start gap-3.5">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full bg-[var(--brand-green)] text-white flex items-center justify-center text-sm font-semibold shrink-0 ring-2 ring-[var(--brand-green)]/10 tracking-wide"
            aria-hidden
          >
            {guestInitials(booking.guest)}
          </div>

          {/* Identity + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={detailPath}
                className="text-[15px] font-semibold text-gray-900 hover:text-[var(--brand-green-dark)] transition-colors tracking-tight truncate"
                title={booking.guest}
              >
                {booking.guest}
              </Link>
              <span className="font-mono text-[11px] text-gray-400 shrink-0">
                {booking.bookingReference || booking.id.slice(0, 8)}
              </span>
            </div>
            <p className="text-[13px] text-gray-500 truncate mt-0.5">{booking.property}</p>
          </div>

          {/* Price */}
          <div className="text-right shrink-0 pl-2">
            <p className="text-[15px] font-bold text-gray-900 tabular-nums leading-tight">
              {booking.total}
            </p>
            <span
              className={cn(
                "inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full leading-none",
                isPaid
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
                  : "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70"
              )}
            >
              {booking.paymentStatus}
            </span>
          </div>
        </div>

        {/* Meta chips row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[3.75rem]">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700">{formatDateRange(booking)}</span>
          </span>
          {isStay ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <Moon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {booking.nights} night{booking.nights === 1 ? "" : "s"}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {booking.guests} guest{booking.guests === 1 ? "" : "s"}
          </span>
        </div>

        {/* Footer: badges + actions */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider">
              {category}
            </span>
            <OpsStatusBadge booking={booking} />
            {attention ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 ring-1 ring-amber-200/80">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                {attention}
              </span>
            ) : null}
            {booking.assignedStaffName ? (
              <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                {booking.assignedStaffName}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/host/messages?booking=${booking.id}`}
              title="Message guest"
              aria-label="Message guest"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>
            <Link
              href={`${detailPath}#staff`}
              title={booking.assignedStaffName ? `Assigned to ${booking.assignedStaffName}` : "Assign staff"}
              aria-label="Assign staff"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <UserCog className="w-4 h-4" />
            </Link>
            <Link
              href={detailPath}
              className="inline-flex items-center gap-1 h-8 pl-3.5 pr-2.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors group/btn"
            >
              Open record
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Notes strip */}
        {special || booking.dietaryNeeds ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {special ? (
              <p className="line-clamp-1 leading-relaxed">
                <span className="font-semibold text-gray-700">Request:</span> {special}
              </p>
            ) : null}
            {booking.dietaryNeeds ? (
              <p className="line-clamp-1 leading-relaxed text-amber-800">
                <span className="font-semibold">Dietary:</span> {booking.dietaryNeeds}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
