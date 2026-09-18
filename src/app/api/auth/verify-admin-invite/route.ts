import { NextResponse } from "next/server";
import { isValidAdminInviteCode } from "@/lib/auth/admin-invite";
import { getRequestId } from "@/lib/observability/logger";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Server-side invite check — keeps ADMIN_INVITE_CODE out of the client bundle. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = (await request.json().catch(() => ({}))) as { inviteCode?: string };
    const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : "";

    const limited = await checkAuthRateLimit(request, inviteCode || "verify-admin-invite");
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "x-request-id": requestId } }
      );
    }

    if (!isValidAdminInviteCode(inviteCode)) {
      return NextResponse.json(
        { error: "Invalid admin invite code." },
        { status: 403, headers: { "x-request-id": requestId } }
      );
    }

    return NextResponse.json({ valid: true }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    console.error("Verify admin invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
