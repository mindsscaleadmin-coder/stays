import { NextResponse } from "next/server";
import {
  getHostVerificationFromDb,
  getHostVerificationsFromDb,
  saveHostVerificationToDb,
} from "@/lib/server/platform-catalog-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostVerificationRequest } from "@/lib/host/verification-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    if (hostId === "all") {
      await requireAdmin();
      const requests = await getHostVerificationsFromDb();
      return NextResponse.json({ requests }, { headers: { "x-request-id": requestId } });
    }
    await requireHostSelfOrAdmin(hostId);
    const verification = await getHostVerificationFromDb(hostId);
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
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const body = (await request.json()) as HostVerificationRequest;
    if (!body?.hostId || body.hostId !== hostId) {
      return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
    }
    const saved = await saveHostVerificationToDb({
      ...body,
      hostId,
      status: "pending",
      submittedAt: body.submittedAt || new Date().toISOString(),
      reviewedAt: undefined,
      reviewNote: undefined,
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
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const { hostId } = await context.params;
    const body = (await request.json()) as { status?: string; reviewNote?: string };
    const existing = await getHostVerificationFromDb(hostId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.status !== "verified" && body.status !== "rejected") {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    const saved = await saveHostVerificationToDb({
      ...existing,
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
