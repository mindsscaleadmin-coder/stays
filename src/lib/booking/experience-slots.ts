import type { Prisma, PrismaClient } from "@prisma/client";
import { experienceSlotDate } from "@/lib/booking/experience-slot-date";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Ensure a capacity row exists for listing+date+session. Does not lock.
 * Callers that book must FOR UPDATE the row after upsert.
 * Never lowers capacity below current bookedCount (avoids oversold slots).
 */
export async function ensureExperienceSlot(
  tx: Tx,
  input: {
    listingId: string;
    dateIso: string;
    session: ExperienceSessionTemplate;
  }
) {
  const date = experienceSlotDate(input.dateIso);
  const existing = await tx.experienceSlot.findUnique({
    where: {
      listingId_date_sessionKey: {
        listingId: input.listingId,
        date,
        sessionKey: input.session.key,
      },
    },
  });

  if (!existing) {
    return tx.experienceSlot.create({
      data: {
        listingId: input.listingId,
        date,
        sessionKey: input.session.key,
        capacity: input.session.capacity,
        bookedCount: 0,
      },
    });
  }

  const nextCapacity = Math.max(input.session.capacity, existing.bookedCount);
  if (nextCapacity === existing.capacity) return existing;

  return tx.experienceSlot.update({
    where: { id: existing.id },
    data: { capacity: nextCapacity },
  });
}
