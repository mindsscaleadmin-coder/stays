import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requireAdmin } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import {
  addGracePeriodIso,
  DEFAULT_BILLING_GRACE_DAYS,
} from "@/lib/host/directory-billing";
import type { DirectoryBillingStatus } from "@/lib/host/directory-billing-types";
import {
  buildDirectorySubscriptionGrantPatch,
  loadDirectorySubscriptionSettings,
} from "@/lib/server/directory-subscription-grant";
import {
  listAdminSubscribers,
  type AdminSubscriberFilter,
} from "@/lib/server/admin-subscribers-repo";
import { getHostProfile, saveHostProfile } from "@/lib/server/host-profile-repo";
import { defaultHostPublicProfile } from "@/lib/host/host-profile-data";

export const dynamic = "force-dynamic";

const FILTERS = new Set<AdminSubscriberFilter>([
  "all",
  "launch_free",
  "suggested",
  "pending_payment",
  "grace",
  "active",
  "expiring_soon",
  "expired",
]);

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const filterRaw = url.searchParams.get("filter") ?? "all";
    const filter = FILTERS.has(filterRaw as AdminSubscriberFilter)
      ? (filterRaw as AdminSubscriberFilter)
      : "all";
    const search = url.searchParams.get("search") ?? "";
    const rows = await listAdminSubscribers({ filter, search });
    return NextResponse.json({ subscribers: rows }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin subscribers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      hostId?: string;
      action?: string;
      notes?: string;
      planId?: string;
      graceDays?: number;
    };
    const hostId = String(body.hostId ?? "").trim();
    if (!hostId) {
      return NextResponse.json({ error: "hostId required" }, { status: 400 });
    }

    const current = (await getHostProfile(hostId)) ?? defaultHostPublicProfile(hostId);
    const settings = await loadDirectorySubscriptionSettings();

    if (body.action === "enable_billing") {
      const graceDays =
        typeof body.graceDays === "number" && body.graceDays > 0
          ? Math.round(body.graceDays)
          : DEFAULT_BILLING_GRACE_DAYS;
      const saved = await saveHostProfile(hostId, {
        ...current,
        directoryBillingEnforced: true,
        directoryBillingEnabledAt: new Date().toISOString(),
        directoryBillingStatus: "pending_payment",
        directoryBillingGraceEndsAt: addGracePeriodIso(graceDays),
        directoryBillingNotes: body.notes ?? current.directoryBillingNotes,
      });
      return NextResponse.json({ profile: saved }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "disable_billing") {
      const saved = await saveHostProfile(hostId, {
        ...current,
        directoryBillingEnforced: false,
        directoryBillingStatus: "launch_free",
        directoryBillingGraceEndsAt: undefined,
        directoryBillingNotes: body.notes ?? current.directoryBillingNotes,
      });
      return NextResponse.json({ profile: saved }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "activate_year" || body.action === "mark_paid") {
      const planId =
        body.planId?.trim() ||
        current.preferredDirectoryPlanId?.trim() ||
        "events-single";
      const recordPayment = current.directoryBillingEnforced === true;
      const grant = buildDirectorySubscriptionGrantPatch(current, planId, settings, new Date(), {
        recordPayment,
      });
      const saved = await saveHostProfile(hostId, {
        ...current,
        ...grant,
        preferredDirectoryPlanId: planId,
        directoryBillingNotes: body.notes ?? current.directoryBillingNotes,
      });
      return NextResponse.json({ profile: saved }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "update_notes") {
      const saved = await saveHostProfile(hostId, {
        ...current,
        directoryBillingNotes: body.notes ?? "",
      });
      return NextResponse.json({ profile: saved }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "set_status") {
      const status = (body as { status?: DirectoryBillingStatus }).status;
      if (!status) {
        return NextResponse.json({ error: "status required" }, { status: 400 });
      }
      const saved = await saveHostProfile(hostId, {
        ...current,
        directoryBillingStatus: status,
      });
      return NextResponse.json({ profile: saved }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin subscribers PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
