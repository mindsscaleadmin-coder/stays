"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  ArrowUpCircle,
  Building2,
  CheckCircle2,
  Headphones,
  Loader2,
  MessageSquare,
  Phone,
  Scale,
  Search,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { AdminOpenDisputesPanel } from "./admin-open-disputes-panel";
import { useAdminSupport } from "@/lib/admin/use-admin-support";
import { useAdminBookings } from "@/lib/admin/use-admin-bookings";
import type { FlatSupportTicket } from "@/lib/admin/support-types";
import { cn } from "@/lib/utils";

type TabId = "all" | "host" | "guest" | "disputes" | "escalations" | "logs";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All tickets" },
  { id: "host", label: "Host tickets" },
  { id: "guest", label: "Guest tickets" },
  { id: "disputes", label: "Disputes" },
  { id: "escalations", label: "Escalations" },
  { id: "logs", label: "Chat & call logs" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  escalated: "bg-red-100 text-red-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const SOURCE_LABELS = { host: "Host", guest: "Guest", dispute: "Dispute" };

function TicketCard({
  ticket,
  supportStaff,
  expanded,
  onToggle,
  onAssign,
  onEscalate,
  onResolve,
  onAddLog,
}: {
  ticket: FlatSupportTicket;
  supportStaff: { id: string; name: string; role: string }[];
  expanded: boolean;
  onToggle: () => void;
  onAssign: (staffId: string) => void;
  onEscalate: () => void;
  onResolve: () => void;
  onAddLog: (type: "chat" | "call" | "email" | "note", summary: string, duration?: number) => void;
}) {
  const [logType, setLogType] = useState<"chat" | "call" | "email" | "note">("note");
  const [logSummary, setLogSummary] = useState("");
  const [logDuration, setLogDuration] = useState("");

  return (
    <article
      className={cn(
        "bg-white rounded-2xl border p-4 sm:p-5 space-y-3",
        ticket.status === "escalated" && "border-red-200 bg-red-50/20",
        ticket.escalationLevel >= 2 && "border-red-300"
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onToggle} className="text-left">
              <h3 className="font-semibold text-gray-900 hover:text-green-800">{ticket.subject}</h3>
            </button>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-gray-100 text-gray-600">
              {SOURCE_LABELS[ticket.source]}
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", STATUS_STYLES[ticket.status])}>
              {ticket.status.replace("_", " ")}
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", PRIORITY_STYLES[ticket.priority])}>
              {ticket.priority}
            </span>
            {ticket.escalationLevel > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                L{ticket.escalationLevel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {ticket.requesterName}
            {ticket.requesterEmail && ` · ${ticket.requesterEmail}`}
            {ticket.bookingRef && ` · ${ticket.bookingRef}`}
            {ticket.property && ` · ${ticket.property}`}
          </p>
          <p className="text-sm text-gray-700 mt-2 line-clamp-2">{ticket.message}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {ticket.id} · Updated {new Date(ticket.updatedAt).toLocaleString("en-GB")}
            {ticket.assigneeStaffName && ` · Assigned to ${ticket.assigneeStaffName}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <select
            value={ticket.assigneeStaffId ?? ""}
            onChange={(e) => e.target.value && onAssign(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700"
          >
            <option value="">Assign to…</option>
            {supportStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <>
              <button
                type="button"
                onClick={onEscalate}
                className="text-xs font-semibold text-orange-700 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
              </button>
              <button
                type="button"
                onClick={onResolve}
                className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          {ticket.communicationLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Communication log</p>
              {ticket.communicationLogs.map((log) => (
                <div key={log.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                    <span className="font-bold uppercase text-gray-600">{log.type}</span>
                    {log.staffName && <span>{log.staffName}</span>}
                    <span>{new Date(log.at).toLocaleString("en-GB")}</span>
                    {log.durationMinutes && <span>{log.durationMinutes} min</span>}
                  </div>
                  <p className="text-xs text-gray-700 mt-1">{log.summary}</p>
                </div>
              ))}
            </div>
          )}

          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Add chat / call / email log</p>
              <div className="flex flex-wrap gap-2">
                {(["chat", "call", "email", "note"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLogType(type)}
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize",
                      logType === type
                        ? "bg-green-700 border-green-700 text-white"
                        : "border-gray-200 text-gray-600"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <textarea
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
                rows={2}
                placeholder="Summary of conversation…"
                className={cn(inputClass, "resize-none text-xs")}
              />
              {logType === "call" && (
                <input
                  type="number"
                  min={1}
                  value={logDuration}
                  onChange={(e) => setLogDuration(e.target.value)}
                  placeholder="Duration (minutes)"
                  className={cn(inputClass, "max-w-[160px] text-xs")}
                />
              )}
              <button
                type="button"
                disabled={!logSummary.trim()}
                onClick={() => {
                  onAddLog(logType, logSummary.trim(), logDuration ? Number(logDuration) : undefined);
                  setLogSummary("");
                  setLogDuration("");
                }}
                className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                Save log entry
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function AdminSupportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "all";

  const {
    ready,
    tickets,
    supportStaff,
    openCount,
    escalatedCount,
    unassignedCount,
    assign,
    escalate,
    setStatus,
    addLog,
  } = useAdminSupport();
  const { openDisputeCount } = useAdminBookings();

  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/support?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const filteredTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (activeTab === "host" && t.source !== "host") return false;
      if (activeTab === "guest" && t.source !== "guest") return false;
      if (activeTab === "disputes" && t.source !== "dispute") return false;
      if (activeTab === "escalations" && t.escalationLevel < 1 && t.status !== "escalated") return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return [
        t.subject,
        t.message,
        t.requesterName,
        t.requesterEmail,
        t.bookingRef,
        t.property,
        t.id,
        t.assigneeStaffName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, activeTab, query, statusFilter]);

  const allLogs = useMemo(
    () =>
      tickets
        .flatMap((t) =>
          t.communicationLogs.map((log) => ({
            ...log,
            ticketId: t.id,
            ticketSubject: t.subject,
            requesterName: t.requesterName,
          }))
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [tickets]
  );

  if (!ready) {
    return (
              <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Support & Dispute Management</h2>
          <p className="text-gray-500 text-sm mt-1">
            Tickets for host/guest requests, booking dispute intervention, and support communication logs.
            {(openCount > 0 || escalatedCount > 0 || openDisputeCount > 0) && (
              <span className="text-amber-600 font-medium">
                {openCount > 0 && ` ${openCount} open tickets`}
                {openDisputeCount > 0 && ` · ${openDisputeCount} open disputes`}
                {escalatedCount > 0 && ` · ${escalatedCount} escalated`}
                {unassignedCount > 0 && ` · ${unassignedCount} unassigned`}
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Open tickets", value: openCount, icon: Ticket },
            { label: "Escalated", value: escalatedCount, icon: AlertTriangle },
            { label: "Unassigned", value: unassignedCount, icon: Users },
            {
              label: "Open disputes",
              value: openDisputeCount,
              icon: Scale,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold font-display text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.id === "disputes" && openDisputeCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {openDisputeCount}
                </span>
              )}
              {tab.id === "escalations" && escalatedCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                  {escalatedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== "logs" && activeTab !== "disputes" && (
          <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tickets, guests, hosts, booking refs…"
                className={cn(inputClass, "ps-9")}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        )}

        {activeTab === "logs" ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Headphones className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Integrated support logs from chat, calls, emails, and internal notes across all tickets.
            </p>
            {allLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
                No communication logs yet.
              </div>
            ) : (
              allLogs.map((log) => (
                <article key={log.id} className="bg-white rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mb-1">
                    {log.type === "call" ? (
                      <Phone className="w-3.5 h-3.5 text-green-700" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-green-700" />
                    )}
                    <span className="font-bold uppercase text-gray-700">{log.type}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-medium text-gray-800">{log.ticketSubject}</span>
                    <span className="text-gray-400">·</span>
                    <span>{log.requesterName}</span>
                    {log.staffName && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span>{log.staffName}</span>
                      </>
                    )}
                    <span className="ms-auto">{new Date(log.at).toLocaleString("en-GB")}</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.summary}</p>
                  {log.durationMinutes && (
                    <p className="text-[10px] text-gray-400 mt-1">Call duration: {log.durationMinutes} min</p>
                  )}
                </article>
              ))
            )}
          </div>
        ) : activeTab === "disputes" ? (
          <AdminOpenDisputesPanel onFlash={flash} />
        ) : (
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
                No tickets match.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  supportStaff={supportStaff}
                  expanded={expandedId === ticket.id}
                  onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                  onAssign={(staffId) => {
                    assign(ticket.id, staffId);
                    flash(`Assigned to support staff.`);
                  }}
                  onEscalate={() => {
                    const reason = prompt("Escalation reason:") ?? "";
                    if (reason === null || !reason.trim()) return;
                    escalate(ticket.id, reason.trim());
                    flash(`Escalated to L${Math.min(3, ticket.escalationLevel + 1)}.`);
                  }}
                  onResolve={() => {
                    setStatus(ticket.id, "resolved");
                    flash("Ticket resolved.");
                  }}
                  onAddLog={(type, summary, duration) => {
                    addLog(ticket.id, { type, summary, durationMinutes: duration });
                    flash("Log entry saved.");
                  }}
                />
              ))
            )}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-green-700" />
            Support staff workload
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supportStaff.map((member) => {
              const assigned = tickets.filter(
                (t) => t.assigneeStaffId === member.id && t.status !== "resolved" && t.status !== "closed"
              ).length;
              return (
                <div key={member.id} className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{member.role.replace("_", " ")}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full shrink-0",
                      assigned > 3 ? "bg-red-100 text-red-700" : assigned > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    )}
                  >
                    {assigned} active
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    
  );
}
