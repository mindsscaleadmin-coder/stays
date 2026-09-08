import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BookingError } from "@/lib/booking/confirm-booking";
import { confirmExperienceBooking } from "@/lib/booking/confirm-experience-booking";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

const runDb =
  process.env.RUN_DB_TESTS === "1" ||
  Boolean(process.env.DATABASE_URL?.includes("localhost"));

const morning: ExperienceSessionTemplate = {
  key: "morning",
  label: "Morning",
  startTime: "09:00",
  endTime: "13:00",
  capacity: 4,
  priceMode: "per_person",
  price: 150,
};

describe.runIf(runDb)("confirmExperienceBooking concurrency", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hostId = `exp-race-host-${suffix}`;
  const listingId = `exp-race-listing-${suffix}`;
  const guestA = `exp-race-guest-a-${suffix}`;
  const guestB = `exp-race-guest-b-${suffix}`;
  const dateIso = "2031-09-15";

  afterAll(async () => {
    await prisma.bookingMessage
      .deleteMany({ where: { booking: { listingId } } })
      .catch(() => null);
    await prisma.booking.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.experienceSlot.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listingPricing.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
    await prisma.user
      .deleteMany({ where: { id: { in: [hostId, guestA, guestB] } } })
      .catch(() => null);
    await prisma.$disconnect();
  });

  it("rejects the second concurrent confirm when capacity is exhausted", async () => {
    await prisma.user.create({
      data: {
        id: hostId,
        fullName: "Exp Race Host",
        email: `${hostId}@hosts.local`,
        roles: JSON.stringify(["host"]),
      },
    });
    await prisma.listing.create({
      data: {
        id: listingId,
        propertyReference: `FS-EXPR-${suffix.slice(0, 8).toUpperCase()}`,
        hostId,
        title: "Race desert safari",
        status: "approved",
        parentCategory: "Experiences",
        payload: JSON.stringify({
          hostName: "Exp Race Host",
          type: "experience",
          parentCategory: "Experiences",
        }),
        maxGuests: 4,
        pricePerNight: 150,
      },
    });
    await prisma.listingPricing.create({
      data: {
        listingId,
        payload: JSON.stringify({
          basePrice: 0,
          currency: "AED",
          sessions: [morning],
          taxPct: 0,
          taxLabel: "VAT",
        }),
      },
    });

    const results = await Promise.allSettled([
      confirmExperienceBooking({
        listingId,
        guestId: guestA,
        dateIso,
        sessionKey: "morning",
        guestCount: 3,
        totalPrice: 450,
        session: morning,
      }),
      confirmExperienceBooking({
        listingId,
        guestId: guestB,
        dateIso,
        sessionKey: "morning",
        guestCount: 3,
        totalPrice: 450,
        session: morning,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(BookingError);
    expect((err as BookingError).code).toBe("UNAVAILABLE");

    const slot = await prisma.experienceSlot.findFirst({ where: { listingId } });
    expect(slot?.bookedCount).toBe(3);
    expect(slot?.capacity).toBe(4);
  });
});
