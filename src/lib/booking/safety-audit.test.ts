/**
 * Safety regression probes for booking capacity / overlap holes.
 * Run: RUN_DB_TESTS=1 npx vitest run src/lib/booking/safety-audit.test.ts
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BookingError, confirmBooking } from "@/lib/booking/confirm-booking";
import { confirmExperienceBooking } from "@/lib/booking/confirm-experience-booking";
import { ensureExperienceSlot } from "@/lib/booking/experience-slots";
import { cancelBooking } from "@/lib/booking/lifecycle";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

const runDb =
  process.env.RUN_DB_TESTS === "1" ||
  Boolean(process.env.DATABASE_URL?.includes("localhost"));

const session: ExperienceSessionTemplate = {
  key: "morning",
  label: "Morning",
  startTime: "09:00",
  endTime: "13:00",
  capacity: 6,
  priceMode: "per_person",
  price: 100,
};

describe.runIf(runDb)("safety audit probes", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const hostId = `audit-host-${suffix}`;
  const expId = `audit-exp-${suffix}`;
  const stayId = `audit-stay-${suffix}`;
  const hybridId = `audit-hybrid-${suffix}`;
  const guests = [`audit-g1-${suffix}`, `audit-g2-${suffix}`, `audit-g3-${suffix}`];

  afterAll(async () => {
    for (const listingId of [expId, stayId, hybridId]) {
      await prisma.bookingMessage.deleteMany({ where: { booking: { listingId } } }).catch(() => null);
      await prisma.bookingNight.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.booking.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.experienceSlot.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.listingPricing.deleteMany({ where: { listingId } }).catch(() => null);
      await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
    }
    await prisma.user.deleteMany({ where: { id: { in: [hostId, ...guests] } } }).catch(() => null);
    await prisma.$disconnect();
  });

  async function seedHost() {
    await prisma.user.create({
      data: {
        id: hostId,
        fullName: "Audit Host",
        email: `${hostId}@hosts.local`,
        roles: JSON.stringify(["host"]),
      },
    });
  }

  it("experience booking on one listing does not block stay on another", async () => {
    await seedHost();
    await prisma.listing.create({
      data: {
        id: expId,
        propertyReference: `FS-AE-${suffix.slice(0, 6).toUpperCase()}`,
        hostId,
        title: "Audit Exp",
        status: "approved",
        parentCategory: "Experiences",
        payload: JSON.stringify({ type: "experience", parentCategory: "Experiences" }),
        maxGuests: 6,
      },
    });
    await prisma.listingPricing.create({
      data: {
        listingId: expId,
        payload: JSON.stringify({ sessions: [session], currency: "AED", taxPct: 0 }),
      },
    });
    await prisma.listing.create({
      data: {
        id: stayId,
        propertyReference: `FS-AS-${suffix.slice(0, 6).toUpperCase()}`,
        hostId,
        title: "Audit Stay",
        status: "approved",
        parentCategory: "Stays",
        payload: JSON.stringify({ type: "farmstay", parentCategory: "Stays" }),
        maxGuests: 4,
        pricePerNight: 100,
      },
    });

    await confirmExperienceBooking({
      listingId: expId,
      guestId: guests[0],
      dateIso: "2033-05-01",
      sessionKey: "morning",
      guestCount: 2,
      totalPrice: 200,
      session,
    });

    const stayBooking = await confirmBooking({
      listingId: stayId,
      guestId: guests[1],
      checkIn: new Date("2033-05-01T12:00:00.000Z"),
      checkOut: new Date("2033-05-03T12:00:00.000Z"),
      guestCount: 2,
      totalPrice: 200,
    });
    expect(stayBooking.id).toBeTruthy();
  });

  it("null checkOut experience rows do not false-positive stay overlap", async () => {
    await prisma.listing.create({
      data: {
        id: hybridId,
        propertyReference: `FS-AH-${suffix.slice(0, 6).toUpperCase()}`,
        hostId,
        title: "Audit Hybrid",
        status: "approved",
        parentCategory: "Stays",
        payload: JSON.stringify({ type: "farmstay", parentCategory: "Stays" }),
        maxGuests: 8,
        pricePerNight: 100,
      },
    });

    const slot = await prisma.experienceSlot.create({
      data: {
        listingId: hybridId,
        date: new Date("2033-06-01T00:00:00.000Z"),
        sessionKey: "morning",
        capacity: 6,
        bookedCount: 2,
      },
    });
    await prisma.booking.create({
      data: {
        bookingReference: `AUD${suffix.slice(0, 6).toUpperCase()}`,
        listingId: hybridId,
        guestId: guests[0],
        checkIn: new Date("2033-06-01T00:00:00.000Z"),
        checkOut: null,
        guestCount: 2,
        totalPrice: 200,
        status: "confirmed",
        paymentStatus: "paid",
        experienceSlotId: slot.id,
      },
    });

    await expect(
      confirmBooking({
        listingId: hybridId,
        guestId: guests[2],
        checkIn: new Date("2033-06-10T12:00:00.000Z"),
        checkOut: new Date("2033-06-12T12:00:00.000Z"),
        guestCount: 2,
        totalPrice: 200,
      })
    ).resolves.toBeTruthy();
  });

  it("enforces listing maxGuests even when session capacity is higher", async () => {
    const listingId = `audit-cap-${suffix}`;
    await prisma.listing.create({
      data: {
        id: listingId,
        propertyReference: `FS-AC-${suffix.slice(0, 6).toUpperCase()}`,
        hostId,
        title: "Low maxGuests high session",
        status: "approved",
        parentCategory: "Experiences",
        payload: JSON.stringify({ type: "experience", parentCategory: "Experiences" }),
        maxGuests: 2,
      },
    });
    await prisma.listingPricing.create({
      data: {
        listingId,
        payload: JSON.stringify({ sessions: [session], currency: "AED", taxPct: 0 }),
      },
    });

    await expect(
      confirmExperienceBooking({
        listingId,
        guestId: guests[2],
        dateIso: "2033-07-01",
        sessionKey: "morning",
        guestCount: 4,
        totalPrice: 400,
        session,
      })
    ).rejects.toMatchObject({ code: "INVALID_DATES" } satisfies Partial<BookingError>);

    await prisma.booking.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.experienceSlot.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listingPricing.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
  });

  it("clamps capacity shrink so bookedCount never exceeds capacity", async () => {
    const listingId = `audit-over-${suffix}`;
    const big: ExperienceSessionTemplate = { ...session, capacity: 10 };
    await prisma.listing.create({
      data: {
        id: listingId,
        propertyReference: `FS-AO-${suffix.slice(0, 6).toUpperCase()}`,
        hostId,
        title: "Capacity shrink",
        status: "approved",
        parentCategory: "Experiences",
        payload: JSON.stringify({ type: "experience", parentCategory: "Experiences" }),
        maxGuests: 20,
      },
    });

    await ensureExperienceSlot(prisma, {
      listingId,
      dateIso: "2033-08-01",
      session: big,
    });
    await prisma.experienceSlot.updateMany({
      where: { listingId },
      data: { bookedCount: 8 },
    });

    const after = await ensureExperienceSlot(prisma, {
      listingId,
      dateIso: "2033-08-01",
      session: { ...session, capacity: 3 },
    });

    expect(after.bookedCount).toBe(8);
    expect(after.capacity).toBe(8);

    await prisma.experienceSlot.deleteMany({ where: { listingId } }).catch(() => null);
    await prisma.listing.deleteMany({ where: { id: listingId } }).catch(() => null);
  });

  it("rejects past experience dates", async () => {
    await expect(
      confirmExperienceBooking({
        listingId: expId,
        guestId: guests[1],
        dateIso: "2020-01-01",
        sessionKey: "morning",
        guestCount: 1,
        totalPrice: 100,
        session,
      })
    ).rejects.toMatchObject({ code: "INVALID_DATES" } satisfies Partial<BookingError>);
  });

  it("cancelling experience booking restores slot capacity", async () => {
    const before = await prisma.experienceSlot.findFirst({ where: { listingId: expId } });
    const booking = await prisma.booking.findFirst({
      where: { listingId: expId, status: "confirmed" },
    });
    expect(booking?.experienceSlotId).toBeTruthy();
    const bookedBefore = before?.bookedCount ?? 0;

    await cancelBooking({
      bookingId: booking!.id,
      reason: "audit cancel",
      actor: "guest",
    });

    const after = await prisma.experienceSlot.findFirst({ where: { listingId: expId } });
    expect(after?.bookedCount).toBe(bookedBefore - booking!.guestCount);
  });
});
