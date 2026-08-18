import { prisma } from "@/lib/prisma";
import type { BookingMessage, BookingMessageSenderRole } from "./booking-messages-types";

function toDto(row: {
  id: string;
  bookingId: string;
  senderRole: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
}): BookingMessage {
  return {
    id: row.id,
    bookingId: row.bookingId,
    senderRole: row.senderRole as BookingMessageSenderRole,
    senderId: row.senderId,
    senderName: row.senderName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBookingMessages(bookingId: string): Promise<BookingMessage[]> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return [];

  const rows = await prisma.bookingMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDto);
}

export async function createBookingMessage(input: {
  bookingId: string;
  senderRole: BookingMessageSenderRole;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<BookingMessage | null> {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) return null;

  const body = input.body.trim();
  if (!body) throw new Error("Message cannot be empty");

  const row = await prisma.bookingMessage.create({
    data: {
      bookingId: input.bookingId,
      senderRole: input.senderRole,
      senderId: input.senderId,
      senderName: input.senderName.trim() || input.senderRole,
      body,
    },
  });
  return toDto(row);
}
