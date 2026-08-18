"use client";

import { Bell, CalendarDays, CreditCard, Loader2, MessageSquare, Megaphone } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostNotifications } from "@/lib/host/use-host-notifications";
import type { NotificationType } from "@/lib/host/host-notifications-types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  booking: CalendarDays,
  payment: CreditCard,
  review: MessageSquare,
  policy: Megaphone,
};

export function HostNotificationsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, savePrefs, markRead, markAllRead } = useHostNotifications(hostId);

  if (!ready || !data) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  const prefRows: { key: keyof typeof data.prefs; label: string; desc: string }[] = [
    { key: "newBookings", label: "New booking alerts", desc: "Requests and instant bookings" },
    { key: "paymentsReceived", label: "Payment received", desc: "Payout and payment confirmations" },
    { key: "reviewsPosted", label: "Review posted", desc: "When a guest leaves a review" },
    { key: "policyUpdates", label: "Policy / platform updates", desc: "Terms and policy changes" },
  ];

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Notifications & Alerts</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage alert preferences and view recent notifications.
            </p>
          </div>
          {data.alerts.some((a) => !a.read) && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Mark all read
            </button>
          )}
        </div>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Alert preferences</h3>
          <ul className="space-y-3">
            {prefRows.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-4 border border-gray-100 rounded-xl p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.label}</p>
                  <p className="text-xs text-gray-500">{row.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.prefs[row.key]}
                  onClick={() =>
                    savePrefs({ ...data.prefs, [row.key]: !data.prefs[row.key] })
                  }
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors shrink-0",
                    data.prefs[row.key] ? "bg-green-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                      data.prefs[row.key] && "translate-x-5"
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Recent alerts</h3>
          </div>
          <ul className="space-y-2">
            {data.alerts.map((alert) => {
              const Icon = TYPE_ICON[alert.type];
              return (
                <li
                  key={alert.id}
                  className={cn(
                    "flex gap-3 border rounded-xl p-3 cursor-pointer transition-colors",
                    alert.read
                      ? "border-gray-100 bg-white"
                      : "border-green-200 bg-green-50/40"
                  )}
                  onClick={() => !alert.read && markRead(alert.id)}
                >
                  <Icon className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(alert.date).toLocaleString()}
                    </p>
                  </div>
                  {!alert.read && (
                    <span className="w-2 h-2 rounded-full bg-green-600 shrink-0 mt-2" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </HostDashboardShell>
  );
}
