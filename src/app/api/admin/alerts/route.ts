import { NextResponse } from "next/server";
import {
  getAdminAlertsStateFromDb,
  saveAdminAlertsStateToDb,
} from "@/lib/server/platform-catalog-repo";
import { DEFAULT_ADMIN_ALERT_SETTINGS } from "@/lib/admin/admin-alerts-data";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { AdminAlertSettings, AdminAlertsState } from "@/lib/admin/admin-alerts-types";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_alerts");
    const state = await getAdminAlertsStateFromDb();
    return NextResponse.json({ state }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin alerts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_alerts");
    const body = await request.json();
    const current = await getAdminAlertsStateFromDb();
    let next: AdminAlertsState = current;

    if (body.action === "markRead" && body.sourceKey) {
      next = {
        ...current,
        readSourceKeys: Array.from(new Set([...current.readSourceKeys, String(body.sourceKey)])),
      };
    } else if (body.action === "markAllRead" && Array.isArray(body.sourceKeys)) {
      next = {
        ...current,
        readSourceKeys: Array.from(
          new Set([...current.readSourceKeys, ...body.sourceKeys.map(String)])
        ),
      };
    } else if (body.action === "dismiss" && body.sourceKey) {
      next = {
        ...current,
        dismissedSourceKeys: Array.from(
          new Set([...current.dismissedSourceKeys, String(body.sourceKey)])
        ),
      };
    } else if (body.action === "saveSettings" && body.settings) {
      next = {
        ...current,
        settings: {
          ...DEFAULT_ADMIN_ALERT_SETTINGS,
          ...body.settings,
          enabledCategories: {
            ...DEFAULT_ADMIN_ALERT_SETTINGS.enabledCategories,
            ...body.settings.enabledCategories,
          },
          systemHealth: {
            ...DEFAULT_ADMIN_ALERT_SETTINGS.systemHealth,
            ...body.settings.systemHealth,
          },
        } as AdminAlertSettings,
      };
    } else if (body.action === "setServiceStatus" && body.service && body.status) {
      const service = body.service as keyof Omit<
        AdminAlertSettings["systemHealth"],
        "lastCheckedAt"
      >;
      next = {
        ...current,
        settings: {
          ...current.settings,
          systemHealth: {
            ...current.settings.systemHealth,
            [service]: body.status,
            lastCheckedAt: new Date().toISOString(),
          },
        },
      };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const state = await saveAdminAlertsStateToDb(next);
    return NextResponse.json({ state }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin alerts PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
