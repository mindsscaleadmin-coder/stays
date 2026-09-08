import type { Prisma, PrismaClient } from "@prisma/client";
import { experienceSlotDate } from "@/lib/booking/experience-slot-date";
import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Ensure a capacity row exists for listing+date+session. Does not lock.
 * Callers that book must FOR UPDATE the row after upsert.
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
  return tx.experienceSlot.upsert({
    where: {
      listingId_date_sessionKey: {
        listingId: input.listingId,
        date,
        sessionKey: input.session.key,
      },
    },
    create: {
      listingId: input.listingId,
      date,
      sessionKey: input.session.key,
      capacity: input.session.capacity,
      bookedCount: 0,
    },
    update: {
      // Keep existing bookedCount; allow capacity to track template when raised.
      capacity: input.session.capacity,
    },
  });
}
