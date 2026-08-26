import { NextResponse } from "next/server";
import {
  deletePlatformStaff,
  getPlatformStaffByEmail,
  listPlatformStaff,
  savePlatformStaff,
} from "@/lib/server/platform-staff-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requireActor, requireAdmin } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { StaffMemberInput } from "@/lib/admin/staff-types";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const actor = await requireActor();
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    if (email) {
      if (email !== actor.email && !canAccessAdmin(actor.roles)) {
        throw new BookingAccessError("Admin access required");
      }
      const member = await getPlatformStaffByEmail(email);
      return NextResponse.json(
        { member: member ?? null },
        { headers: { "x-request-id": requestId } }
      );
    }
    if (!canAccessAdmin(actor.roles)) {
      throw new BookingAccessError("Admin access required");
    }
    const staff = await listPlatformStaff();
    return NextResponse.json({ staff }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = (await request.json()) as StaffMemberInput;
    const member = await savePlatformStaff(body);
    return NextResponse.json({ member }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Platform staff create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = (await request.json()) as StaffMemberInput;
    if (!body.id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }
    const member = await savePlatformStaff(body);
    return NextResponse.json({ member }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Platform staff update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }
    const ok = await deletePlatformStaff(id);
    if (!ok) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Platform staff delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
