/** Booking date/status presentation helpers (shared by dashboard and host UI). */

export function formatBookingDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const STATUS_STYLES: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-700",
  confirmed: "bg-green-100 text-green-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  Completed: "bg-gray-100 text-gray-600",
  completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
