"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  Users,
  XCircle,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import type { EventAvailabilityStatus } from "@/lib/events/event-availability-types";
import { useHostEventRequests } from "@/lib/host/use-host-event-requests";

const STATUS_STYLES: Record<EventAvailabilityStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  available: "bg-green-100 text-green-800",
  unavailable: "bg-gray-200 text-gray-700",
};

const STATUS_LABELS: Record<EventAvailabilityStatus, string> = {
  pending: "Awaiting your reply",
  available: "Confirmed available",
  unavailable: "Declined",
};

function formatDate(iso?: string) {
  if (!iso) return "Flexible date";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSent(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HostEventRequestsContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { requests, ready, refresh } = useHostEventRequests(hostId);

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | EventAvailabilityStatus>("pending");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function respond(id: string, status: "available" | "unavailable") {
    setSaving(id);
    try {
      const res = await fetch(`/api/event-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, hostNote: notes[id]?.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        flash(data?.error || "Could not save your reply. Try again.");
        return;
      }
      await refresh(true);
      flash(
        status === "available"
          ? "Marked available — the guest can now see your contact details."
          : "Marked unavailable. The guest was told the date is taken."
      );
    } catch {
      flash("Could not save your reply. Check your connection.");
    } finally {
      setSaving(null);
    }
  }

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      available: requests.filter((r) => r.status === "available").length,
      unavailable: requests.filter((r) => r.status === "unavailable").length,
    };
  }, [requests]);

  const visible = useMemo(
    () => (filter === "all" ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">
            Event availability requests
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Guests ask you to confirm a date. Your contact details stay hidden until you mark a
            request available — then the guest can message you directly.
          </p>
        </div>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3"
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(["pending", "available", "unavailable", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                filter === key
                  ? "bg-green-700 border-green-700 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300"
              }`}
            >
              {key === "all" ? "All" : STATUS_LABELS[key]} ({counts[key]})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {filter === "pending" ? "No requests waiting on you" : "Nothing here yet"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Availability requests from your event listings appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">{request.listingTitle}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[request.status]}`}
                      >
                        {STATUS_LABELS[request.status]}
                      </span>
                    </div>
                    {request.spaceName && (
                      <p className="text-xs text-gray-500 mt-0.5">{request.spaceName}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 shrink-0">
                    Sent {formatSent(request.createdAt)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Occasion
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {request.occasion || "Event"}
                    </p>
                    {request.partyType && (
                      <p className="text-[11px] text-gray-500">{request.partyType}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Requested date
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {request.dateFlexible ? "Flexible date" : formatDate(request.eventDate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Guests
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {request.guestCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Guest
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5 truncate">
                      {request.guestName}
                    </p>
                    {request.guestEmail && (
                      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" />
                        {request.guestEmail}
                      </p>
                    )}
                    {request.guestPhone && (
                      <p className="text-[11px] text-gray-500 truncate">{request.guestPhone}</p>
                    )}
                  </div>
                </div>

                {request.message && (
                  <p className="mt-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-700">
                    “{request.message}”
                  </p>
                )}

                {request.status === "pending" ? (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">
                        Message to the guest (optional)
                      </span>
                      <textarea
                        value={notes[request.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Yes, that date is open — happy to walk you through the hall."
                        className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving === request.id}
                        onClick={() => void respond(request.id, "available")}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {saving === request.id ? "Saving…" : "Confirm available"}
                      </button>
                      <button
                        type="button"
                        disabled={saving === request.id}
                        onClick={() => void respond(request.id, "unavailable")}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 disabled:opacity-60"
                      >
                        <XCircle className="w-4 h-4" />
                        Not available
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Confirming shares your WhatsApp number from your public profile with this
                      guest.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {request.hostNote && (
                      <p className="text-sm text-gray-600">
                        Your reply: “{request.hostNote}”
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {request.status === "available"
                        ? "The guest can see your contact details."
                        : "The guest was told this date is unavailable."}
                      {request.respondedAt ? ` · ${formatSent(request.respondedAt)}` : ""}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </HostDashboardShell>
  );
}
