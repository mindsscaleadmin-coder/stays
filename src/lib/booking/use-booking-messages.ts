"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookingMessage, BookingMessageSenderRole } from "./booking-messages-types";
import {
  BOOKING_MESSAGES_SYNC_EVENT,
  appendBookingMessage,
  loadBookingMessages,
  mergeBookingMessagesFromServer,
} from "./booking-messages-data";

export function useBookingMessages(bookingId: string | undefined) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(() => {
    if (!bookingId) {
      setMessages([]);
      setReady(true);
      return;
    }
    setMessages(loadBookingMessages(bookingId));
    setReady(true);
  }, [bookingId]);

  useEffect(() => {
    refresh();
    if (!bookingId) return;

    void (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          mergeBookingMessagesFromServer(bookingId, data.messages);
          setMessages(loadBookingMessages(bookingId));
        }
      } catch {
        // local-only is fine
      }
    })();

    function onSync() {
      refresh();
    }
    window.addEventListener(BOOKING_MESSAGES_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(BOOKING_MESSAGES_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [bookingId, refresh]);

  const send = useCallback(
    async (input: {
      body: string;
      senderRole: BookingMessageSenderRole;
      senderId: string;
      senderName: string;
    }) => {
      if (!bookingId) return null;
      setSending(true);
      try {
        const local = appendBookingMessage({ bookingId, ...input });
        setMessages(loadBookingMessages(bookingId));

        void fetch(`/api/bookings/${bookingId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            if (data.persisted && data.message) {
              mergeBookingMessagesFromServer(bookingId, [data.message]);
              setMessages(loadBookingMessages(bookingId));
            }
          })
          .catch(() => null);

        return local;
      } finally {
        setSending(false);
      }
    },
    [bookingId]
  );

  return { ready, messages, sending, send, refresh };
}
