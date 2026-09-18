import { NextResponse } from "next/server";
import { getHostProfile, saveHostProfile } from "@/lib/server/host-profile-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostPublicProfileInput } from "@/lib/host/host-profile-types";
import { defaultHostPublicProfile } from "@/lib/host/host-profile-data";
import { canAccessAdmin } from "@/lib/auth/roles";

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
    const actor = await requireHostSelfOrAdmin(hostId);
    const admin = !actor || canAccessAdmin(actor.roles) || isDemoApiMode();

    const body = (await request.json()) as Partial<HostPublicProfileInput>;
    const current = (await getHostProfile(hostId)) ?? defaultHostPublicProfile(hostId);

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
      instantBookEnabled: true,
      ...(admin && body.eventsSubscriptionExpiresAt !== undefined
        ? { eventsSubscriptionExpiresAt: body.eventsSubscriptionExpiresAt }
        : {}),
      ...(admin && body.diningSubscriptionExpiresAt !== undefined
        ? { diningSubscriptionExpiresAt: body.diningSubscriptionExpiresAt }
        : {}),
      ...(admin && body.directoryComboExpiresAt !== undefined
        ? { directoryComboExpiresAt: body.directoryComboExpiresAt }
        : {}),
      ...(admin && body.eventsVenueSpaces !== undefined
        ? { eventsVenueSpaces: body.eventsVenueSpaces }
        : {}),
      ...(admin && body.eventsHallSpaces !== undefined
        ? { eventsHallSpaces: body.eventsHallSpaces }
        : {}),
      ...(admin && body.diningOutletSpaces !== undefined
        ? { diningOutletSpaces: body.diningOutletSpaces }
        : {}),
      ...(body.preferredDirectoryPlanId !== undefined
        ? { preferredDirectoryPlanId: body.preferredDirectoryPlanId }
        : {}),
      ...(admin && body.directoryBillingEnforced !== undefined
        ? { directoryBillingEnforced: body.directoryBillingEnforced }
        : {}),
      ...(admin && body.directoryBillingStatus !== undefined
        ? { directoryBillingStatus: body.directoryBillingStatus }
        : {}),
      ...(admin && body.directoryBillingEnabledAt !== undefined
        ? { directoryBillingEnabledAt: body.directoryBillingEnabledAt }
        : {}),
      ...(admin && body.directoryBillingPaidAt !== undefined
        ? { directoryBillingPaidAt: body.directoryBillingPaidAt }
        : {}),
      ...(admin && body.directoryBillingNotes !== undefined
        ? { directoryBillingNotes: body.directoryBillingNotes }
        : {}),
      ...(admin && body.directoryBillingGraceEndsAt !== undefined
        ? { directoryBillingGraceEndsAt: body.directoryBillingGraceEndsAt }
        : {}),
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
