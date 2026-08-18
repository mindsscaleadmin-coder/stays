import { NextResponse } from "next/server";
import { getHostProfile, saveHostProfile } from "@/lib/server/host-profile-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostPublicProfileInput } from "@/lib/host/host-profile-types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const { hostId } = await context.params;
  const profile = await getHostProfile(hostId);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const body = (await request.json()) as Partial<HostPublicProfileInput>;
    const current = await getHostProfile(hostId);
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const saved = await saveHostProfile(hostId, {
      displayName: body.displayName ?? current.displayName,
      companyName: body.companyName ?? current.companyName,
      bio: body.bio ?? current.bio,
      city: body.city ?? current.city,
      whatsapp: body.whatsapp ?? current.whatsapp,
      preferWhatsapp: body.preferWhatsapp ?? current.preferWhatsapp,
      logoUrl: body.logoUrl ?? current.logoUrl,
      logoFileName: body.logoFileName ?? current.logoFileName,
      logoBytes: body.logoBytes ?? current.logoBytes,
      logoWidth: body.logoWidth ?? current.logoWidth,
      logoHeight: body.logoHeight ?? current.logoHeight,
      instantBookEnabled: body.instantBookEnabled ?? current.instantBookEnabled,
    });

    return NextResponse.json(
      { profile: saved },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host profile save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
