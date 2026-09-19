import { NextResponse } from "next/server";
import {
  deletePlatformStaff,
  getPlatformStaffByEmail,
  getPlatformStaffById,
  listPlatformStaff,
  savePlatformStaff,
} from "@/lib/server/platform-staff-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requireActor, requirePlatformStaff } from "@/lib/auth/guards";
import {
  assertStaffRoleAssignment,
} from "@/lib/auth/platform-staff-guards";
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
      const selfLookup = email === actor.email?.trim().toLowerCase();
      if (!selfLookup) {
        await requirePlatformStaff("manage_staff");
      }
      const member = await getPlatformStaffByEmail(email);
      return NextResponse.json(
        { member: member ?? null },
        { headers: { "x-request-id": requestId } }
      );
    }
    await requirePlatformStaff("manage_staff");
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
    const { staff } = await requirePlatformStaff("manage_staff");
    const body = (await request.json()) as StaffMemberInput;
    await assertStaffRoleAssignment(staff, body);
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
    const { staff } = await requirePlatformStaff("manage_staff");
    const body = (await request.json()) as StaffMemberInput;
    if (!body.id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }
    await assertStaffRoleAssignment(staff, body);
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
    const { staff } = await requirePlatformStaff("manage_staff");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }
    const target = await getPlatformStaffById(id);
    if (target?.role === "admin" && staff.role !== "admin") {
      throw new BookingAccessError("Only Super Admin can remove Super Admin accounts", 403);
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
