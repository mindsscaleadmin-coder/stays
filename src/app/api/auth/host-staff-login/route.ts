import { NextResponse } from "next/server";
import {
  findActiveHostStaffByEmail,
  findHostStaffLogin,
} from "@/lib/server/host-staff-repo";
import { getRequestId } from "@/lib/observability/logger";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Host staff login when credentials live in Postgres (shared DB). */
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

    const staffMatch = await findHostStaffLogin(email, password);
    if (staffMatch) {
      return NextResponse.json(
        {
          ok: true as const,
          staff: {
            id: staffMatch.id,
            hostId: staffMatch.hostId,
            name: staffMatch.name,
            email: staffMatch.email,
            role: staffMatch.role,
          },
        },
        { headers: { "x-request-id": requestId } }
      );
    }

    const staffAccount = await findActiveHostStaffByEmail(email);
    if (staffAccount) {
      if (!staffAccount.password) {
        return NextResponse.json(
          {
            ok: false as const,
            error:
              "No password set for this staff account. Ask the host owner to set one under User / Staff.",
          },
          { status: 401, headers: { "x-request-id": requestId } }
        );
      }
      return NextResponse.json(
        { ok: false as const, error: "Invalid email or password." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    return NextResponse.json(
      { ok: false as const, error: "Invalid email or password." },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    console.error("Host staff login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
