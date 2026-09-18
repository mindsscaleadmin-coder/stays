import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import { isValidOperationalTime } from "@/lib/host/operational-settings-data";
import {
  getHostOperationalSettingsBundle,
  saveHostOperationalSettings,
} from "@/lib/server/host-operational-settings-repo";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  autoCheckInOutEnabled: z.boolean().optional(),
  checkInTime: z
    .string()
    .refine((v) => isValidOperationalTime(v), "Invalid check-in time")
    .optional(),
  checkOutTime: z
    .string()
    .refine((v) => isValidOperationalTime(v), "Invalid check-out time")
    .optional(),
  noShowCutoffTime: z
    .string()
    .refine((v) => isValidOperationalTime(v), "Invalid no-show cutoff")
    .optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(_request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const bundle = await getHostOperationalSettingsBundle(hostId);
    return NextResponse.json(bundle, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    throw error;
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
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
        { status: 400 }
      );
    }

    await saveHostOperationalSettings(hostId, parsed.data);
    const bundle = await getHostOperationalSettingsBundle(hostId);
    return NextResponse.json(bundle, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
