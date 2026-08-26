"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Loader2,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { useHostNotifications } from "@/lib/host/use-host-notifications";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import { expiryLabel } from "@/lib/host/host-daily-ops";
import { formatBookingDate } from "@/lib/mock/dashboard-data";
import { alertDestination } from "@/lib/host/notification-destinations";
import type {
  HostNotificationAlert,
  HostNotificationPrefs,
  NotificationType,
} from "@/lib/host/host-notifications-types";
import { cn } from "@/lib/utils";

type InboxTab = "all" | NotificationType;

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  booking: CalendarDays,
  payment: CreditCard,
  review: MessageSquare,
  policy: Megaphone,
};

const TABS: {
  id: InboxTab;
  label: string;
  pref?: keyof HostNotificationPrefs;
}[] = [
  { id: "all", label: "All" },
  { id: "booking", label: "Bookings", pref: "newBookings" },
  { id: "payment", label: "Payments", pref: "paymentsReceived" },
  { id: "review", label: "Reviews", pref: "reviewsPosted" },
  { id: "policy", label: "Policy", pref: "policyUpdates" },
];

export function HostNotificationsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready, savePrefs, markRead, markAllRead } = useHostNotifications(hostId);
  const { bookings, ready: bookingsReady } = useHostBookings();
  const [tab, setTab] = useState<InboxTab>("all");

  if (!ready || !data) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  const pending = bookingsReady
    ? bookings.filter((booking) => booking.status === "pending")
    : [];
  const linkedBookingIds = new Set(
    data.alerts
      .map((alert) => alert.href?.match(/\/host\/bookings\/([^/?#]+)/)?.[1])
      .filter(Boolean)
  );

  const inbox: HostNotificationAlert[] = [
    ...pending
      .filter((booking) => !linkedBookingIds.has(booking.id))
      .map((booking) => ({
        id: `pending-${booking.id}`,
        type: "booking" as const,
        title: "New booking request",
        message: `${booking.guest} · ${booking.property} · ${formatBookingDate(booking.checkIn)} → ${formatBookingDate(booking.checkOut)}${
          expiryLabel(booking.expiresAt) ? ` · ${expiryLabel(booking.expiresAt)}` : ""
        }`,
        date: booking.bookedAt || new Date().toISOString(),
        read: false,
        href: `/host/bookings/${booking.id}`,
      })),
    ...data.alerts,
  ];

  const tabCounts: Record<InboxTab, number> = {
    all: inbox.length,
    booking: 0,
    payment: 0,
    review: 0,
    policy: 0,
  };
  for (const alert of inbox) tabCounts[alert.type] += 1;

  const visibleInbox = tab === "all" ? inbox : inbox.filter((alert) => alert.type === tab);
  const activeTab = TABS.find((item) => item.id === tab);
  const prefKey = activeTab?.pref;
  const prefOn = prefKey ? data.prefs[prefKey] : true;

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Notifications</h2>
            <p className="text-gray-500 text-sm mt-1">
              Switch tabs to review each type. Tap an alert to open its page.
            </p>
          </div>
          {data.alerts.some((a) => !a.read) && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-xs font-semibold text-green-800 border border-green-200 bg-white px-3 py-1.5 rounded-full hover:bg-green-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {TABS.map((item) => {
            const Icon = item.id === "all" ? Bell : TYPE_ICON[item.id];
            const selected = tab === item.id;
            const count = tabCounts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex items-center gap-2 shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold border transition-colors",
                  selected
                    ? "bg-[var(--brand-green)] border-[var(--brand-green)] text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-gray-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {item.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-[1.15rem] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      selected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {prefKey ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Receive {activeTab?.label.toLowerCase()} alerts
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {prefOn ? "New ones will show in this tab." : "This type is muted."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefOn}
              onClick={() => savePrefs({ ...data.prefs, [prefKey]: !prefOn })}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors shrink-0",
                prefOn ? "bg-[var(--brand-green)]" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  prefOn && "translate-x-5"
                )}
              />
            </button>
          </div>
        ) : null}

        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">
              {tab === "all" ? "Inbox" : activeTab?.label}
            </h3>
          </div>
          {visibleInbox.length === 0 ? (
            <p className="text-sm text-gray-500">
              {tab === "all" ? "No alerts yet." : `No ${activeTab?.label.toLowerCase()} alerts.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleInbox.map((alert) => {
                const Icon = TYPE_ICON[alert.type] ?? Bell;
                const dest = alertDestination(alert);
                const isPolicy = alert.type === "policy";
                return (
                  <li key={alert.id}>
                    <Link
                      href={dest.href}
                      className={cn(
                        "flex gap-3 border rounded-xl p-3 transition-colors hover:border-green-300",
                        alert.read ? "border-gray-100 bg-white" : "border-green-200 bg-green-50/40"
                      )}
                      onClick={() => {
                        if (!alert.read && !alert.id.startsWith("pending-")) {
                          void markRead(alert.id);
                        }
                      }}
                    >
                      <Icon className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-green-800">
                          {dest.label}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{alert.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(alert.date).toLocaleString()}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 shrink-0 self-center text-xs font-semibold text-green-700">
                        {!isPolicy && dest.label.replace("Open ", "")}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </HostDashboardShell>
  );
}
