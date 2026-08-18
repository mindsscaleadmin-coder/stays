import { prisma } from "@/lib/prisma";
import type { StayReview } from "./stay-reviews-types";

function toDto(row: {
  id: string;
  listingId: string;
  authorId: string;
  bookingId: string | null;
  rating: number;
  comment: string;
  status: string;
  createdAt: Date;
  author?: { fullName: string } | null;
}): StayReview {
  return {
    id: row.id,
    bookingId: row.bookingId || "",
    listingId: row.listingId,
    authorId: row.authorId,
    authorName: row.author?.fullName || "Guest",
    property: "",
    rating: row.rating,
    comment: row.comment,
    status: (row.status as StayReview["status"]) || "published",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPublishedReviews(listingId: string): Promise<StayReview[]> {
  const rows = await prisma.review.findMany({
    where: { listingId, status: "published" },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function createStayReview(input: {
  bookingId: string;
  listingId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<StayReview> {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { code: "NOT_FOUND" });
  }
  if (booking.guestId !== input.authorId) {
    throw Object.assign(new Error("Only the guest who stayed can review"), {
      code: "FORBIDDEN",
    });
  }
  if (booking.status !== "completed") {
    const checkOut = booking.checkOut;
    const confirmedAndStayed =
      booking.status === "confirmed" &&
      checkOut &&
      checkOut.getTime() <= Date.now();
    if (!confirmedAndStayed) {
      throw Object.assign(new Error("Reviews unlock only after a completed stay"), {
        code: "NOT_ELIGIBLE",
      });
    }
  }
  if (booking.listingId !== input.listingId) {
    throw Object.assign(new Error("Listing does not match booking"), { code: "INVALID" });
  }

  const existing = await prisma.review.findFirst({
    where: { bookingId: input.bookingId },
  });
  if (existing) {
    throw Object.assign(new Error("You already reviewed this stay"), {
      code: "ALREADY_REVIEWED",
    });
  }

  // Ensure author user exists
  const author = await prisma.user.findUnique({ where: { id: input.authorId } });
  if (!author) {
    await prisma.user.create({
      data: {
        id: input.authorId,
        fullName: input.authorName || "Guest",
        email: `${input.authorId}@guests.local`,
        roles: JSON.stringify(["guest"]),
      },
    });
  }

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const comment = input.comment.trim();
  if (comment.length < 10) {
    throw Object.assign(new Error("Please write at least 10 characters"), {
      code: "INVALID",
    });
  }

  const row = await prisma.review.create({
    data: {
      listingId: input.listingId,
      authorId: input.authorId,
      bookingId: input.bookingId,
      rating,
      comment,
      status: "published",
    },
    include: { author: true },
  });

  return toDto(row);
}
