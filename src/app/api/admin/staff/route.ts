import { NextResponse } from "next/server";
import {
  deletePlatformStaff,
  getPlatformStaffByEmail,
  listPlatformStaff,
  savePlatformStaff,
} from "@/lib/server/platform-staff-repo";
import { requireSessionUser, AuthError } from "@/lib/auth/session";
import { getUserRoles, isDemoApiMode, BookingAccessError } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import type { StaffMemberInput } from "@/lib/admin/staff-types";

export const dynamic = "force-dynamic";

async function requireAdminWhenConfigured() {
  if (isDemoApiMode()) return;
  const user = await requireSessionUser();
  if (!canAccessAdmin(getUserRoles(user))) {
    throw new BookingAccessError("Admin access required");
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (email) {
    const member = await getPlatformStaffByEmail(email);
    return NextResponse.json({ member: member ?? null });
  }
  const staff = await listPlatformStaff();
  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdminWhenConfigured();
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
    await requireAdminWhenConfigured();
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
    await requireAdminWhenConfigured();
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
