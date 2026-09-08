import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BookingError, confirmBooking } from "@/lib/booking/confirm-booking";
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
  price: 200,
};

describe.runIf(runDb)("experience smoke e2e", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const hostId = `smoke-host-${suffix}`;
  const expListingId = `smoke-exp-${suffix}`;
  const stayListingId = `smoke-stay-${suffix}`;
  const guest1 = `smoke-g1-${suffix}`;
  const guest2 = `smoke-g2-${suffix}`;
  const guest3 = `smoke-g3-${suffix}`;

  afterAll(async () => {
    for (const listingId of [expListingId, stayListingId]) {
      await prisma.bookingMessage
        .deleteMany({ where: { booking: { listingId } } })
        .catch(() => null);
      await prisma.bookingNight.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.booking.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.experienceSlot.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.listingPricing.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
    }
    await prisma.user
      .deleteMany({ where: { id: { in: [hostId, guest1, guest2, guest3] } } })
      .catch(() => null);
    await prisma.$disconnect();
  });

  it("fills capacity then keeps stay night booking intact", async () => {
    await prisma.user.create({
      data: {
        id: hostId,
        fullName: "Smoke Host",
        email: `${hostId}@hosts.local`,
        roles: JSON.stringify(["host"]),
      },
    });

    await prisma.listing.create({
      data: {
        id: expListingId,
        propertyReference: `FS-SEXP-${suffix.slice(0, 8).toUpperCase()}`,
        hostId,
        title: "Smoke Desert Safari",
        status: "approved",
        parentCategory: "Experiences",
        payload: JSON.stringify({
          type: "experience",
          parentCategory: "Experiences",
          hostName: "Smoke Host",
        }),
        maxGuests: 6,
      },
    });
    await prisma.listingPricing.create({
      data: {
        listingId: expListingId,
        payload: JSON.stringify({
          basePrice: 0,
          currency: "AED",
          sessions: [morning],
          taxPct: 5,
          taxLabel: "VAT",
        }),
      },
    });

    await prisma.listing.create({
      data: {
        id: stayListingId,
        propertyReference: `FS-SSTAY-${suffix.slice(0, 8).toUpperCase()}`,
        hostId,
        title: "Smoke Farm Stay",
        status: "approved",
        parentCategory: "Stays",
        payload: JSON.stringify({
          type: "farmstay",
          parentCategory: "Stays",
          hostName: "Smoke Host",
        }),
        maxGuests: 4,
        pricePerNight: 300,
      },
    });

    await confirmExperienceBooking({
      listingId: expListingId,
      guestId: guest1,
      dateIso: "2032-01-10",
      sessionKey: "morning",
      guestCount: 3,
      totalPrice: 630,
      session: morning,
    });

    await expect(
      confirmExperienceBooking({
        listingId: expListingId,
        guestId: guest2,
        dateIso: "2032-01-10",
        sessionKey: "morning",
        guestCount: 2,
        totalPrice: 420,
        session: morning,
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" } satisfies Partial<BookingError>);

    await confirmExperienceBooking({
      listingId: expListingId,
      guestId: guest2,
      dateIso: "2032-01-10",
      sessionKey: "morning",
      guestCount: 1,
      totalPrice: 210,
      session: morning,
    });

    const slot = await prisma.experienceSlot.findFirst({ where: { listingId: expListingId } });
    expect(slot?.bookedCount).toBe(4);

    await confirmBooking({
      listingId: stayListingId,
      guestId: guest3,
      checkIn: new Date("2032-02-01T12:00:00.000Z"),
      checkOut: new Date("2032-02-03T12:00:00.000Z"),
      guestCount: 2,
      totalPrice: 600,
    });

    expect(await prisma.bookingNight.count({ where: { listingId: stayListingId } })).toBe(2);
    expect(await prisma.bookingNight.count({ where: { listingId: expListingId } })).toBe(0);
  });
});
