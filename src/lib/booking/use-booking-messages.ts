"use client";

import { useCallback, useEffect, useState } from "react";
import type { BookingMessage, BookingMessageSenderRole } from "./booking-messages-types";
import {
  BOOKING_MESSAGES_SYNC_EVENT,
  appendBookingMessage,
  loadBookingMessages,
  mergeBookingMessagesFromServer,
  replaceBookingMessagesFromServer,
} from "./booking-messages-data";
import { looksLikeServerBookingId } from "@/lib/guest/guest-bookings-data";

export function useBookingMessages(bookingId: string | undefined) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  const applyLocal = useCallback(() => {
    if (!bookingId) {
      setMessages([]);
      return;
    }
    setMessages(loadBookingMessages(bookingId));
  }, [bookingId]);

  const refreshFromServer = useCallback(async () => {
    if (!bookingId) {
      setMessages([]);
      setReady(true);
      return;
    }

    applyLocal();

    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`);
      if (res.status === 404) {
        if (looksLikeServerBookingId(bookingId)) {
          replaceBookingMessagesFromServer(bookingId, []);
          setMessages([]);
        }
        setReady(true);
        return;
      }
      if (!res.ok) {
        setReady(true);
        return;
      }
      const data = (await res.json()) as { messages?: BookingMessage[] };
      const server = Array.isArray(data.messages) ? data.messages : [];
      replaceBookingMessagesFromServer(bookingId, server);
      setMessages(loadBookingMessages(bookingId));
    } catch {
      applyLocal();
    } finally {
      setReady(true);
    }
  }, [applyLocal, bookingId]);

  useEffect(() => {
    void refreshFromServer();
    if (!bookingId) return;

    function onSync() {
      applyLocal();
    }
    window.addEventListener(BOOKING_MESSAGES_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshFromServer();
    }, 20_000);

    return () => {
      window.removeEventListener(BOOKING_MESSAGES_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
      window.clearInterval(poll);
    };
  }, [applyLocal, bookingId, refreshFromServer]);

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
        const res = await fetch(`/api/bookings/${bookingId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: BookingMessage;
        };

        if (res.ok && data.message) {
          mergeBookingMessagesFromServer(bookingId, [data.message]);
          setMessages(loadBookingMessages(bookingId));
          return data.message;
        }

        if (!looksLikeServerBookingId(bookingId)) {
          const local = appendBookingMessage({ bookingId, ...input });
          setMessages(loadBookingMessages(bookingId));
          return local;
        }

        throw new Error(data.error || "Could not send message");
      } finally {
        setSending(false);
      }
    },
    [bookingId]
  );

  return { ready, messages, sending, send, refresh: refreshFromServer };
}
