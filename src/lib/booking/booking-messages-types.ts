export type BookingMessageSenderRole = "guest" | "host" | "admin";

export type BookingMessage = {
  id: string;
  bookingId: string;
  senderRole: BookingMessageSenderRole;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type BookingThreadMeta = {
  bookingId: string;
  property?: string;
  guestName?: string;
  hostName?: string;
  updatedAt: string;
};
