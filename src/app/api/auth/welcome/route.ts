import { NextResponse } from "next/server";
import { requireSessionUser, AuthError, authErrorResponse } from "@/lib/auth/session";
import { enqueueWelcomeEmailJob } from "@/lib/queue/enqueue";
import { getRequestId } from "@/lib/observability/logger";

/** Enqueue welcome email after sign-up — never sent synchronously in the auth path. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const user = await requireSessionUser();
    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.fullName as string | undefined);

    await enqueueWelcomeEmailJob({
      userId: user.id,
      email,
      fullName,
    });

    return NextResponse.json(
      { ok: true, queued: true },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
