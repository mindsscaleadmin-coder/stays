import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BookingError, confirmBooking } from "@/lib/booking/confirm-booking";

const runDb =
  process.env.RUN_DB_TESTS === "1" ||
  Boolean(process.env.DATABASE_URL?.includes("localhost"));

describe.runIf(runDb)("confirmBooking concurrency", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostId = `race-host-${suffix}`;
  const listingId = `race-listing-${suffix}`;
  const guestA = `race-guest-a-${suffix}`;
  const guestB = `race-guest-b-${suffix}`;
  const checkIn = new Date("2031-08-10T12:00:00.000Z");
  const checkOut = new Date("2031-08-12T12:00:00.000Z");

  afterAll(async () => {
    await prisma.bookingNight.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.bookingMessage.deleteMany({
      where: { booking: { listingId } },
    }).catch(() => null);
    await prisma.booking.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
    await prisma.user
      .deleteMany({ where: { id: { in: [hostId, guestA, guestB] } } })
      .catch(() => null);
    await prisma.$disconnect();
  });

  it("rejects the second concurrent confirm for the same nights", async () => {
    await prisma.user.create({
      data: {
        id: hostId,
        fullName: "Race Host",
        email: `${hostId}@hosts.local`,
        roles: JSON.stringify(["host"]),
      },
    });
    await prisma.listing.create({
      data: {
        id: listingId,
        propertyReference: `FS-RACE-${suffix.slice(0, 8).toUpperCase()}`,
        hostId,
        title: "Race farm stay",
        status: "approved",
        payload: JSON.stringify({
          hostName: "Race Host",
          maxGuests: 8,
          pricePerNight: 100,
        }),
        maxGuests: 8,
        pricePerNight: 100,
      },
    });

    const results = await Promise.allSettled([
      confirmBooking({
        listingId,
        guestId: guestA,
        checkIn,
        checkOut,
        guestCount: 2,
        totalPrice: 200,
      }),
      confirmBooking({
        listingId,
        guestId: guestB,
        checkIn,
        checkOut,
        guestCount: 2,
        totalPrice: 200,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(BookingError);
    expect((err as BookingError).code).toBe("UNAVAILABLE");

    const bookings = await prisma.booking.findMany({
      where: { listingId, status: "confirmed" },
    });
    expect(bookings).toHaveLength(1);

    const nights = await prisma.bookingNight.findMany({ where: { listingId } });
    expect(nights).toHaveLength(2);

    // Unique constraint still present even if app checks are bypassed later.
    await expect(
      prisma.bookingNight.create({
        data: {
          listingId,
          bookingId: bookings[0]!.id,
          date: nights[0]!.date,
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  }, 30_000);
});
