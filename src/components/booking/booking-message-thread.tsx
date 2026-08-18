"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Shield } from "lucide-react";
import { useBookingMessages } from "@/lib/booking/use-booking-messages";
import type { BookingMessageSenderRole } from "@/lib/booking/booking-messages-types";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<BookingMessageSenderRole, string> = {
  guest: "bg-blue-50 border-blue-100 text-blue-900",
  host: "bg-green-50 border-green-100 text-green-900",
  admin: "bg-amber-50 border-amber-100 text-amber-950",
};

const ROLE_LABEL: Record<BookingMessageSenderRole, string> = {
  guest: "Guest",
  host: "Host",
  admin: "Support",
};

export function BookingMessageThread({
  bookingId,
  viewerRole,
  viewerId,
  viewerName,
  title = "Booking messages",
  subtitle,
  compact = false,
}: {
  bookingId: string;
  viewerRole: BookingMessageSenderRole;
  viewerId: string;
  viewerName: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const { ready, messages, sending, send } = useBookingMessages(bookingId);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setError(null);
    try {
      await send({
        body: draft,
        senderRole: viewerRole,
        senderId: viewerId,
        senderName: viewerName,
      });
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <section
      className={cn(
        "bg-white rounded-2xl border border-gray-200 flex flex-col",
        compact ? "max-h-[420px]" : "max-h-[560px]"
      )}
    >
      <header className="px-4 py-3 border-b border-gray-100 flex items-start gap-2 shrink-0">
        <MessageSquare className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {subtitle ||
              "Thread for this booking only — guest, host, and admin support share the same conversation."}
          </p>
        </div>
        {viewerRole === "admin" && (
          <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[160px]">
        {!ready ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-green-700" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8 px-4">
            No messages yet. Ask about check-in, directions, or special requests here.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === viewerId || m.senderRole === viewerRole;
            return (
              <div
                key={m.id}
                className={cn("flex flex-col max-w-[90%]", mine ? "ms-auto items-end" : "items-start")}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {m.senderName}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                      ROLE_STYLES[m.senderRole]
                    )}
                  >
                    {ROLE_LABEL[m.senderRole]}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed border",
                    mine
                      ? "bg-green-700 text-white border-green-700 rounded-tr-md"
                      : "bg-gray-50 text-gray-800 border-gray-100 rounded-tl-md"
                  )}
                >
                  {m.body}
                </div>
                <time className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(m.createdAt).toLocaleString()}
                </time>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 shrink-0 space-y-2">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={
              viewerRole === "admin"
                ? "Reply as support on this booking thread…"
                : "Write a message…"
            }
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            maxLength={4000}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="self-end inline-flex items-center justify-center gap-1.5 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white font-semibold text-sm px-3.5 py-2.5 rounded-xl shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
