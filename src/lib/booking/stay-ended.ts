/** True when the guest has finished the stay (reviews may unlock). */
export function bookingStayHasEnded(
  booking: { status: string; checkOut: Date | string | null | undefined },
  now = new Date()
): boolean {
  if (booking.status === "completed") return true;
  if (booking.status !== "confirmed" || !booking.checkOut) return false;

  const raw = booking.checkOut;
  const end =
    raw instanceof Date
      ? new Date(raw)
      : new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(end.getTime())) return false;
  if (raw instanceof Date || (typeof raw === "string" && raw.length !== 10)) {
    end.setHours(12, 0, 0, 0);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return end.getTime() <= today.getTime();
}
