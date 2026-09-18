import { prisma } from "@/lib/prisma";
import { withAudit } from "@/lib/booking/booking-audit";
import {
  canAutoCheckInNow,
  canAutoCheckOutNow,
  isArrivalDay,
  isDepartureDay,
} from "@/lib/booking/operational-time";
import type { OperationalSettings } from "@/lib/host/operational-settings-types";
import { loadOperationalSettingsByHostIds } from "@/lib/server/host-operational-settings-repo";

export async function autoCheckInDueArrivals(now: Date = new Date()) {
  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      paymentStatus: "paid",
      checkInStatus: "pending",
      noShow: false,
      disputeStatus: { not: "open" },
      experienceSlotId: null,
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      checkInStatus: true,
      status: true,
      paymentStatus: true,
      noShow: true,
      disputeStatus: true,
      experienceSlotId: true,
      auditLog: true,
      listing: { select: { hostId: true } },
    },
  });

  const settingsByHost = await loadOperationalSettingsByHostIds(
    candidates.map((row) => row.listing.hostId)
  );

  let count = 0;
  for (const row of candidates) {
    const settings = settingsByHost.get(row.listing.hostId);
    if (!settings?.autoCheckInOutEnabled) continue;
    if (!isArrivalDay(row.checkIn, now, settings)) continue;
    if (!canAutoCheckInNow(now, settings)) continue;

    await prisma.booking.update({
      where: { id: row.id },
      data: {
        checkInStatus: "checked_in",
        checkedInAt: now,
        checkInSource: "auto",
        auditLog: withAudit(row.auditLog, {
          actor: "System",
          action: "Auto checked in",
          detail: `Scheduled check-in at ${settings.noShowCutoffTime || settings.checkInTime} (${settings.timezone})`,
        }),
      },
    });
    count += 1;
  }

  return { count };
}

export async function autoCheckOutDueDepartures(now: Date = new Date()) {
  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      checkInStatus: { not: "checked_out" },
      noShow: false,
      disputeStatus: { not: "open" },
      experienceSlotId: null,
      checkOut: { not: null },
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      checkInStatus: true,
      status: true,
      paymentStatus: true,
      noShow: true,
      disputeStatus: true,
      experienceSlotId: true,
      auditLog: true,
      checkedInAt: true,
      listing: { select: { hostId: true } },
    },
  });

  const settingsByHost = await loadOperationalSettingsByHostIds(
    candidates.map((row) => row.listing.hostId)
  );

  let count = 0;
  for (const row of candidates) {
    if (!row.checkOut) continue;
    const settings = settingsByHost.get(row.listing.hostId);
    if (!settings?.autoCheckInOutEnabled) continue;
    if (!isDepartureDay(row.checkOut, now, settings)) continue;
    if (!canAutoCheckOutNow(now, settings)) continue;

    await prisma.booking.update({
      where: { id: row.id },
      data: {
        status: "completed",
        checkInStatus: "checked_out",
        checkedInAt: row.checkedInAt ?? now,
        checkedOutAt: now,
        checkOutSource: "auto",
        auditLog: withAudit(row.auditLog, {
          actor: "System",
          action: "Auto checked out",
          detail: `Scheduled check-out at ${settings.checkOutTime} (${settings.timezone})`,
        }),
      },
    });
    count += 1;
  }

  return { count };
}

export async function runOperationalSync(now: Date = new Date()) {
  const checkIns = await autoCheckInDueArrivals(now);
  const checkOuts = await autoCheckOutDueDepartures(now);
  return {
    checkIns: checkIns.count,
    checkOuts: checkOuts.count,
  };
}
