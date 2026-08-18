export type NotificationType =
  | "booking"
  | "payment"
  | "review"
  | "policy";

export interface HostNotificationAlert {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface HostNotificationPrefs {
  newBookings: boolean;
  paymentsReceived: boolean;
  reviewsPosted: boolean;
  policyUpdates: boolean;
}

export interface HostNotificationsData {
  hostId: string;
  prefs: HostNotificationPrefs;
  alerts: HostNotificationAlert[];
}
