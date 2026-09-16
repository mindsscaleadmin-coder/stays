import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, getSessionUser, requireSessionUser } from "@/lib/auth/session";
import {
  assertGuestOwnsBooking,
  BookingAccessError,
  bookingAccessResponse,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import {
  createStayReview,
  getReviewByBookingId,
  getReviewEligibilityForBooking,
  listPublishedReviews,
} from "@/lib/booking/stay-reviews-repo";
import { expirePendingBookings } from "@/lib/booking/lifecycle";
import { getRequestId } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const bookingId = searchParams.get("bookingId");

  try {
    if (bookingId) {
      await expirePendingBookings();

      if (!isDemoApiMode()) {
        const user = await getSessionUser();
        if (!user) throw new AuthError("Sign in required");
        const booking = await loadBookingWithListing(bookingId);
        if (!booking) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        assertGuestOwnsBooking(booking, user.id);
      }

      const [review, eligibility] = await Promise.all([
        getReviewByBookingId(bookingId),
        getReviewEligibilityForBooking(bookingId),
      ]);
      if (!eligibility && !review) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json(
        { review, eligibility },
        { headers: { "x-request-id": requestId } }
      );
    }

    if (!listingId) {
      return NextResponse.json({ error: "listingId or bookingId required" }, { status: 400 });
    }
    const reviews = await listPublishedReviews(listingId);
    return NextResponse.json({ reviews }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return bookingAccessResponse(error, requestId);
    }
    throw error;
  }
}

const postSchema = z.object({
  bookingId: z.string().min(1),
  listingId: z.string().min(1),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

export async function POST(request: Request) {
  try {
    await expirePendingBookings();
    const json = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
    }

    let authorId = parsed.data.authorId;
    let authorName = parsed.data.authorName;
    if (!isDemoApiMode()) {
      const user = await requireSessionUser();
      authorId = user.id;
      authorName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        authorName;
    }

    const review = await createStayReview({
      ...parsed.data,
      authorId,
      authorName,
    });
    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const err = error as Error & { code?: string };
    const status =
      err.code === "NOT_FOUND"
        ? 404
        : err.code === "FORBIDDEN"
          ? 403
          : err.code === "NOT_ELIGIBLE" || err.code === "ALREADY_REVIEWED"
            ? 409
            : 400;
    return NextResponse.json({ error: err.message, code: err.code }, { status });
  }
}
