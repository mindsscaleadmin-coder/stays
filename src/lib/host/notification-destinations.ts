import type { HostNotificationAlert, NotificationType } from "./host-notifications-types";

export const NOTIFICATION_DESTINATIONS: Record<
  NotificationType,
  { href: string; label: string }
> = {
  booking: { href: "/host/bookings", label: "Open Bookings" },
  payment: { href: "/host/accounts", label: "Open Accounts" },
  review: { href: "/host/reviews", label: "Open Reviews" },
  policy: { href: "/host/notifications", label: "Policy update" },
};

export function alertDestination(alert: Pick<HostNotificationAlert, "type" | "href">) {
  const dest = NOTIFICATION_DESTINATIONS[alert.type] ?? NOTIFICATION_DESTINATIONS.booking;
  return {
    href: alert.href || dest.href,
    label: dest.label,
  };
}
