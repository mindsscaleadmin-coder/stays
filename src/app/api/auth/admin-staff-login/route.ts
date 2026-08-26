import { NextResponse } from "next/server";
import { verifyPlatformStaffPassword } from "@/lib/server/platform-staff-repo";
import { getRequestId } from "@/lib/observability/logger";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const limited = await checkAuthRateLimit(request, email);
    if (!limited.success) {
      return NextResponse.json(
        { ok: false as const, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "x-request-id": requestId } }
      );
    }
    const result = await verifyPlatformStaffPassword(email, password);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false as const, error: result.error },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    return NextResponse.json(
      { ok: true as const, member: result.member },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Admin staff login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
