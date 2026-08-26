import type { BookingMessage, BookingMessageSenderRole } from "./booking-messages-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-booking-messages";
export const BOOKING_MESSAGES_SYNC_EVENT = "farm-stays-booking-messages-updated";

type Store = Record<string, BookingMessage[]>;

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(BOOKING_MESSAGES_SYNC_EVENT);
}

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  notify();
}

export function loadBookingMessages(bookingId: string): BookingMessage[] {
  const list = readStore()[bookingId] ?? [];
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function appendBookingMessage(input: {
  bookingId: string;
  senderRole: BookingMessageSenderRole;
  senderId: string;
  senderName: string;
  body: string;
}): BookingMessage {
  const body = input.body.trim();
  if (!body) {
    throw new Error("Message cannot be empty");
  }
  const message: BookingMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    bookingId: input.bookingId,
    senderRole: input.senderRole,
    senderId: input.senderId,
    senderName: input.senderName.trim() || input.senderRole,
    body,
    createdAt: new Date().toISOString(),
  };
  const store = readStore();
  const prev = store[input.bookingId] ?? [];
  store[input.bookingId] = [...prev, message];
  writeStore(store);
  return message;
}

export function mergeBookingMessagesFromServer(
  bookingId: string,
  serverMessages: BookingMessage[]
): BookingMessage[] {
  const local = loadBookingMessages(bookingId);
  const map = new Map<string, BookingMessage>();
  for (const m of local) map.set(m.id, m);
  for (const m of serverMessages) map.set(m.id, m);
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const store = readStore();
  store[bookingId] = merged;
  writeStore(store);
  return merged;
}

/** Server list is the thread. Used after a successful GET. */
export function replaceBookingMessagesFromServer(
  bookingId: string,
  serverMessages: BookingMessage[]
): BookingMessage[] {
  const next = [...serverMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const store = readStore();
  store[bookingId] = next;
  writeStore(store);
  return next;
}
