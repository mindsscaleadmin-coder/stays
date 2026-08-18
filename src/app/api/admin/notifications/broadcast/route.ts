import { NextResponse } from "next/server";
import { pushPolicyAlertToAllHosts } from "@/lib/server/host-notifications-repo";
import { requireSessionUser, AuthError } from "@/lib/auth/session";
import { getUserRoles } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const user = await requireSessionUser();
    if (!canAccessAdmin(getUserRoles(user))) {
      throw new BookingAccessError("Admin access required");
    }

    const body = (await request.json()) as { title?: string; message?: string };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const count = await pushPolicyAlertToAllHosts(title, message);
    return NextResponse.json(
      { ok: true, count },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Notification broadcast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
