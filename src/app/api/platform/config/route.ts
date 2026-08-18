import { NextResponse } from "next/server";
import {
  getPlatformConfig,
  getPlatformConfigAdmin,
  savePlatformConfig,
} from "@/lib/server/platform-config-repo";
import { requireSessionUser, AuthError, authErrorResponse } from "@/lib/auth/session";
import { getUserRoles } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import type { PlatformConfig } from "@/lib/admin/platform-config-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get("admin") === "1";

  if (adminView) {
    const requestId = getRequestId(request);
    try {
      const user = await requireSessionUser();
      const roles = getUserRoles(user);
      if (!canAccessAdmin(roles)) {
        throw new BookingAccessError("Admin access required");
      }
      const config = await getPlatformConfigAdmin();
      return NextResponse.json(
        { config },
        { headers: { "x-request-id": requestId } }
      );
    } catch (error) {
      if (error instanceof AuthError || error instanceof BookingAccessError) {
        return hostDataErrorResponse(error, requestId);
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const config = await getPlatformConfig(true);
  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    const user = await requireSessionUser();
    const roles = getUserRoles(user);
    if (!canAccessAdmin(roles)) {
      throw new BookingAccessError("Admin access required");
    }

    const body = (await request.json()) as Partial<PlatformConfig>;
    const current = await getPlatformConfigAdmin();
    const next: PlatformConfig = {
      ...current,
      ...body,
      global: { ...current.global, ...body.global },
      features: {
        ...current.features,
        ...body.features,
        hostFeatures: {
          ...current.features.hostFeatures,
          ...body.features?.hostFeatures,
        },
        hostBounds: {
          ...current.features.hostBounds,
          ...body.features?.hostBounds,
        },
      },
      integrations: {
        ...current.integrations,
        ...body.integrations,
        paymentGateway: {
          ...current.integrations.paymentGateway,
          ...body.integrations?.paymentGateway,
        },
        emailProvider: {
          ...current.integrations.emailProvider,
          ...body.integrations?.emailProvider,
        },
        smsProvider: {
          ...current.integrations.smsProvider,
          ...body.integrations?.smsProvider,
        },
        mapsApi: {
          ...current.integrations.mapsApi,
          ...body.integrations?.mapsApi,
        },
      },
      security: { ...current.security, ...body.security },
    };

    const saved = await savePlatformConfig(next);
    return NextResponse.json(
      { config: saved },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Platform config save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
