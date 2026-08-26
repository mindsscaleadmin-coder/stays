import { NextResponse } from "next/server";
import {
  getGuestVerificationFromDb,
  saveGuestVerificationToDb,
} from "@/lib/server/platform-catalog-repo";
import {
  hostDataErrorResponse,
  requireGuestSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type {
  GuestIdDocumentType,
  GuestVerificationRequest,
} from "@/lib/guest/guest-verification-types";

export const dynamic = "force-dynamic";

const ID_TYPES: GuestIdDocumentType[] = ["emirates_id", "passport", "trade_license"];

export async function GET(
  request: Request,
  context: { params: Promise<{ guestId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { guestId } = await context.params;
    if (!isDemoApiMode()) {
      await requireGuestSelfOrAdmin(guestId);
    }
    const verification = await getGuestVerificationFromDb(guestId);
    return NextResponse.json({ request: verification }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ guestId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { guestId } = await context.params;
    if (!isDemoApiMode()) {
      await requireGuestSelfOrAdmin(guestId);
    }
    const body = (await request.json()) as Partial<GuestVerificationRequest>;
    const idType = ID_TYPES.includes(body.idType as GuestIdDocumentType)
      ? (body.idType as GuestIdDocumentType)
      : "emirates_id";
    const saved = await saveGuestVerificationToDb({
      userId: guestId,
      idType,
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
    return NextResponse.json({ request: saved }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ guestId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    if (!isDemoApiMode()) {
      await requireAdmin();
    }
    const { guestId } = await context.params;
    const body = (await request.json()) as { status?: string; reviewNote?: string };
    const existing = await getGuestVerificationFromDb(guestId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.status !== "verified" && body.status !== "rejected") {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    const saved = await saveGuestVerificationToDb({
      ...existing,
      userId: guestId,
      status: body.status,
      reviewedAt: new Date().toISOString(),
      reviewNote: body.reviewNote?.trim() || undefined,
    });
    return NextResponse.json({ request: saved }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
