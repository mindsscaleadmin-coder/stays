/** Calendar nights between check-in and check-out, stored at noon to match host blocks. */
export function stayNightDates(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];
  const startIso = checkIn.toISOString().slice(0, 10);
  const endIso = checkOut.toISOString().slice(0, 10);
  const cursor = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
