import { prisma } from "@/lib/prisma";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nightsBetween(checkIn: Date, checkOut: Date | null): string[] {
  if (!checkOut) return [ymd(checkIn)];
  const dates: string[] = [];
  const cursor = new Date(checkIn);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(12, 0, 0, 0);
  while (cursor < end) {
    dates.push(ymd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Occupied nights from active bookings (pending + confirmed). */
export async function getBookingOccupiedDates(listingId: string): Promise<string[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      listingId,
      status: { in: ["pending", "confirmed"] },
    },
    select: { checkIn: true, checkOut: true },
  });

  const occupied = new Set<string>();
  for (const b of bookings) {
    for (const iso of nightsBetween(b.checkIn, b.checkOut)) {
      occupied.add(iso);
    }
  }
  return Array.from(occupied).sort();
}
