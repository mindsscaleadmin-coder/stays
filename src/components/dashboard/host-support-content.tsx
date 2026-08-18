"use client";

import { useState } from "react";
import {
  HelpCircle,
  LifeBuoy,
  Loader2,
  Phone,
  Ticket,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId, resolveHostName } from "@/lib/listings/use-listing-submissions";
import { useHostSupport } from "@/lib/host/use-host-support";
import { cn } from "@/lib/utils";

export function HostSupportContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { data, ready, submitTicket } = useHostSupport(hostId, hostName);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    submitTicket(subject, message);
    setSubject("");
    setMessage("");
    setFlash("Ticket submitted. Our team will respond within 24 hours.");
    setTimeout(() => setFlash(""), 4000);
  }

  if (!ready || !data) {
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
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Support</h2>
          <p className="text-gray-500 text-sm mt-1">
            Help center, raise a ticket, or reach the platform support team.
          </p>
        </div>

        {flash && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {flash}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Platform support</h3>
          </div>
          <p className="text-sm text-gray-600">
            Host support line:{" "}
            <a href="tel:+971800FARM" className="font-semibold text-green-700">
              +971 800 FARM (3276)
            </a>
          </p>
          <p className="text-xs text-gray-500">Sun–Thu, 9 AM – 6 PM GST · English</p>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Raise a ticket</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Payout not received"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe your issue…"
              />
            </label>
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              Submit ticket
            </button>
          </form>
        </section>

        {data.tickets.length > 0 && (
          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Your tickets</h3>
            </div>
            <ul className="space-y-2">
              {data.tickets.map((t) => (
                <li
                  key={t.id}
                  className="border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{t.subject}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        t.status === "open" && "bg-blue-100 text-blue-700",
                        t.status === "in_progress" && "bg-amber-100 text-amber-700",
                        t.status === "resolved" && "bg-green-100 text-green-700"
                      )}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {t.id} · {new Date(t.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <LifeBuoy className="w-3.5 h-3.5" />
          Community forum and help center links open in a new tab when configured.
        </p>
      </div>
    </HostDashboardShell>
  );
}
