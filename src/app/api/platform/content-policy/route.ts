import { NextResponse } from "next/server";
import {
  getContentPolicyFromDb,
  saveContentPolicyToDb,
} from "@/lib/server/platform-catalog-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requireAdmin } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import { normalizeContentPolicy } from "@/lib/admin/content-policy-data";
import type { ContentPolicySettings } from "@/lib/admin/content-policy-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getContentPolicyFromDb();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<ContentPolicySettings>;
    const settings = await saveContentPolicyToDb(normalizeContentPolicy(body));
    return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
