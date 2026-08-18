import { NextResponse } from "next/server";
import { getHostAnalytics } from "@/lib/server/host-analytics-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const { hostId } = await context.params;
  const data = await getHostAnalytics(hostId);
  return NextResponse.json({ data });
}
