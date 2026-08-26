import { NextResponse } from "next/server";
import { isValidAdminInviteCode } from "@/lib/auth/admin-invite";
import { AuthError, authErrorResponse, requireSessionUser } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import { savePlatformStaff } from "@/lib/server/platform-staff-repo";
import { DEFAULT_PERMISSIONS } from "@/lib/admin/staff-types";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** After admin sign-up, record the user in PlatformStaff using a server-checked invite. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = (await request.json().catch(() => ({}))) as { inviteCode?: string };
    const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode : "";

    const limited = await checkAuthRateLimit(request, inviteCode || "claim-admin");
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

    const user = await requireSessionUser();
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const member = await savePlatformStaff({
      name:
        (user.user_metadata?.full_name as string | undefined) ||
        email.split("@")[0] ||
        "Admin",
      email,
      role: "admin",
      permissions: [...DEFAULT_PERMISSIONS.admin],
      active: true,
    });

    return NextResponse.json(
      { ok: true as const, member },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, requestId);
    }
    if (error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Claim admin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
