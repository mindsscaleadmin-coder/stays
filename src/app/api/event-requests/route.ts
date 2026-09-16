import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isDemoApiMode } from "@/lib/auth/booking-access";
import { requireSessionUser, AuthError, authErrorResponse } from "@/lib/auth/session";
import { resolveSessionActor } from "@/lib/auth/resolve-actor";
import { canAccessAdmin } from "@/lib/auth/roles";
import { getRequestId } from "@/lib/observability/logger";
import {
  createEventAvailabilityRequest,
  listGuestEventRequests,
  listHostEventRequests,
} from "@/lib/server/event-availability-repo";
import { checkEnquiryRateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    listingId: z.string().min(1),
    occasion: z.string().min(1).max(80),
    partyType: z.string().min(1).max(100),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "eventDate must be YYYY-MM-DD")
      .optional(),
    dateFlexible: z.boolean().optional().default(false),
    guestCount: z.number().int().min(1).max(5000),
    guestName: z.string().min(1).max(120),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().min(4).max(40).optional(),
    spaceId: z.string().max(120).optional(),
    spaceName: z.string().max(200).optional(),
    message: z.string().max(1000).optional(),
    guestId: z.string().min(1).optional(),
  })
  .refine((body) => body.dateFlexible || Boolean(body.eventDate), {
    message: "Choose an event date or mark the date as flexible",
    path: ["eventDate"],
  });

/**
 * GET ?role=host&hostId=…      → requests for a host's venues
 * GET ?role=guest&guestId=…    → the guest's own requests (host contact only once confirmed)
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") === "guest" ? "guest" : "host";
    const listingId = searchParams.get("listingId") || undefined;

    let hostId = searchParams.get("hostId") || undefined;
    let guestId = searchParams.get("guestId") || undefined;

    if (!isDemoApiMode()) {
      const user = await requireSessionUser();
      if (role === "guest") {
        guestId = user.id;
      } else {
        const actor = await resolveSessionActor(user);
        hostId = canAccessAdmin(actor.roles) ? hostId : actor.staffHostId || user.id;
      }
    }

    if (role === "guest") {
      if (!guestId) {
        return NextResponse.json({ error: "guestId required" }, { status: 400 });
      }
      const requests = await listGuestEventRequests(guestId, listingId);
      return NextResponse.json({ requests }, { headers: { "x-request-id": requestId } });
    }

    if (!hostId) {
      return NextResponse.json({ error: "hostId required" }, { status: 400 });
    }
    const requests = await listHostEventRequests(hostId);
    return NextResponse.json({ requests }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, requestId);
    console.error("List event requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const ipLimited = await checkEnquiryRateLimit(request);
    if (!ipLimited.success) {
      return tooManyRequestsResponse(ipLimited.remaining, requestId);
    }

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    let guestId = body.guestId ?? null;
    let guestName = body.guestName;
    let guestEmail = body.guestEmail;

    if (!isDemoApiMode()) {
      const user = await requireSessionUser();
      guestId = user.id;
      guestEmail = guestEmail || user.email || undefined;
      guestName =
        guestName || (user.user_metadata?.full_name as string | undefined) || guestName;
    }

    if (!guestId) {
      return NextResponse.json(
        { error: "Sign in required to request availability" },
        { status: 401 }
      );
    }

    const userLimited = await checkEnquiryRateLimit(request, guestId, "user");
    if (!userLimited.success) {
      return tooManyRequestsResponse(userLimited.remaining, requestId);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      select: {
        id: true,
        title: true,
        hostId: true,
        status: true,
        parentCategory: true,
        payload: true,
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    let payloadType = "";
    let payloadCategory = "";
    try {
      const payload = JSON.parse(listing.payload) as { type?: string; category?: string };
      payloadType = payload.type ?? "";
      payloadCategory = payload.category ?? "";
    } catch {
      // ignore malformed payload — taxonomy columns still decide
    }

    if (
      !isDirectoryListing({
        parentCategory: listing.parentCategory,
        type: payloadType,
        category: payloadCategory,
      })
    ) {
      return NextResponse.json(
        { error: "Availability requests apply to directory listings only" },
        { status: 400 }
      );
    }

    const saved = await createEventAvailabilityRequest({
      listingId: listing.id,
      listingTitle: listing.title,
      hostId: listing.hostId,
      guestId,
      guestName,
      guestEmail,
      guestPhone: body.guestPhone,
      spaceId: body.spaceId,
      spaceName: body.spaceName,
      occasion: body.occasion,
      partyType: body.partyType,
      eventDate: body.eventDate,
      dateFlexible: body.dateFlexible,
      guestCount: body.guestCount,
      message: body.message,
    });

    return NextResponse.json(
      { request: saved },
      { status: 201, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, requestId);
    console.error("Create event request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
