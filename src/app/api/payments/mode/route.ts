import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/stripe/server";

/** Whether checkout should send the guest to Stripe or use demo pay. */
export async function GET() {
  return NextResponse.json({
    mode: isStripeConfigured() ? ("stripe" as const) : ("demo" as const),
  });
}
