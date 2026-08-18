import { NextResponse } from "next/server";
import { z } from "zod";
import { createStayReview, listPublishedReviews } from "@/lib/booking/stay-reviews-repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  const reviews = await listPublishedReviews(listingId);
  return NextResponse.json({ reviews });
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
    const json = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
    }

    const review = await createStayReview(parsed.data);
    return NextResponse.json({ review });
  } catch (error) {
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
