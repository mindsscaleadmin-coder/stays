import { NextResponse } from "next/server";
import {
  deleteHostStaffMember,
  ensureHostOwnerStaff,
  listHostStaffMembers,
  saveHostStaffMember,
} from "@/lib/server/host-staff-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostStaffMemberInput, HostStaffRole } from "@/lib/host/host-staff-types";
import { permissionsForHostStaffRole } from "@/lib/host/host-staff-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    const actor = await requireHostSelfOrAdmin(hostId);
    if (actor?.email) {
      await ensureHostOwnerStaff({
        hostId,
        name: actor.email.split("@")[0] || "Owner",
        email: actor.email,
      });
    }

    const staff = await listHostStaffMembers(hostId);
    return NextResponse.json({ staff }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host staff list error:", error);
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

    const body = (await request.json()) as Omit<HostStaffMemberInput, "hostId">;
    const role = (body.role ?? "staff") as HostStaffRole;

    if (role === "owner") {
      return NextResponse.json(
        { error: "Only the account holder can be Owner." },
        { status: 400 }
      );
    }

    const member = await saveHostStaffMember({
      hostId,
      name: body.name,
      email: body.email,
      role,
      permissions: body.permissions?.length
        ? body.permissions
        : permissionsForHostStaffRole(role),
      active: body.active ?? true,
      password: body.password,
    });

    return NextResponse.json(
      { member },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host staff create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const body = (await request.json()) as HostStaffMemberInput;
    if (!body.id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }

    const member = await saveHostStaffMember({
      ...body,
      hostId,
    });

    return NextResponse.json(
      { member },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host staff update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing staff id" }, { status: 400 });
    }

    const ok = await deleteHostStaffMember(hostId, id);
    if (!ok) {
      return NextResponse.json({ error: "Cannot remove staff member" }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host staff delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
