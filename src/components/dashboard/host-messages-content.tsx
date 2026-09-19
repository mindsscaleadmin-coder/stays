"use client";

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  Home,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostMessages } from "@/lib/host/use-host-messages";
import { useBookingMessages } from "@/lib/booking/use-booking-messages";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { formatBookingDate } from "@/lib/booking/display";
import type { HostMessageInboxRow } from "@/lib/host/host-messages-types";
import { cn } from "@/lib/utils";

// --- Deterministic Palette by Seed ---
const SEED_PALETTE = [
  { text: "text-emerald-800", bg: "bg-emerald-100 border-emerald-300", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { text: "text-blue-800", bg: "bg-blue-100 border-blue-300", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  { text: "text-violet-800", bg: "bg-violet-100 border-violet-300", badge: "bg-violet-50 text-violet-800 border-violet-200" },
  { text: "text-amber-800", bg: "bg-amber-100 border-amber-300", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  { text: "text-rose-800", bg: "bg-rose-100 border-rose-300", badge: "bg-rose-50 text-rose-800 border-rose-200" },
  { text: "text-teal-800", bg: "bg-teal-100 border-teal-300", badge: "bg-teal-50 text-teal-800 border-teal-200" },
  { text: "text-indigo-800", bg: "bg-indigo-100 border-indigo-300", badge: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  { text: "text-cyan-800", bg: "bg-cyan-100 border-cyan-300", badge: "bg-cyan-50 text-cyan-800 border-cyan-200" },
];

function getSeedStyle(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SEED_PALETTE[Math.abs(hash) % SEED_PALETTE.length]!;
}

function formatDisplayName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return "Guest";
  if (!trimmed.includes(" ") && trimmed === trimmed.toLowerCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
  }
  if (name.length >= 2) {
    return name.slice(0, 2).toUpperCase();
  }
  return (name[0] || "G").toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTimeOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateDivider(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function getStayContext(checkInStr: string, checkOutStr?: string): {
  label: string;
  badgeStyle: string;
  nights?: number;
} {
  const now = new Date();
  const todayYmd = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  let nights: number | undefined;
  if (checkOutStr) {
    const d1 = new Date(`${checkInStr}T00:00:00Z`).getTime();
    const d2 = new Date(`${checkOutStr}T00:00:00Z`).getTime();
    nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  if (checkOutStr && todayYmd > checkOutStr) {
    return {
      label: "Past stay",
      badgeStyle: "bg-gray-100 text-gray-600 border-gray-200",
      nights,
    };
  }

  if (todayYmd >= checkInStr && (!checkOutStr || todayYmd <= checkOutStr)) {
    return {
      label: "Currently hosting",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
      nights,
    };
  }

  const checkInDate = new Date(`${checkInStr}T00:00:00Z`);
  const todayDate = new Date(`${todayYmd}T00:00:00Z`);
  const diffDays = Math.round(
    (checkInDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return {
      label: "Checking in today",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200 font-semibold",
      nights,
    };
  }
  if (diffDays === 1) {
    return {
      label: "Arriving tomorrow",
      badgeStyle: "bg-amber-50 text-amber-900 border-amber-200 font-semibold",
      nights,
    };
  }
  if (diffDays > 1 && diffDays <= 7) {
    return {
      label: `In ${diffDays} days`,
      badgeStyle: "bg-teal-50 text-teal-800 border-teal-200",
      nights,
    };
  }

  return {
    label: "Upcoming stay",
    badgeStyle: "bg-gray-100 text-gray-700 border-gray-200",
    nights,
  };
}

// Quick reply templates for hosts
const QUICK_TEMPLATES = [
  { label: "👋 Welcome", text: "Hello! Thank you for booking with us. We're excited to host you and looking forward to your stay!" },
  { label: "🔑 Check-in", text: "Hi! Check-in starts at 2:00 PM. Please let us know your estimated arrival time so we can prepare for your arrival." },
  { label: "📶 Wi-Fi", text: "Hi! The Wi-Fi details and farm amenities guide will be shared upon arrival. Let us know if you have any questions beforehand!" },
  { label: "✨ Enjoy your stay", text: "Hi! We hope everything is comfortable. Please feel free to reach out if you need anything at all during your time here." },
];

export function HostMessagesContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [page, setPage] = useState(1);
  const { data, ready, error, refresh } = useHostMessages(hostId, page);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs_reply" | "replied">("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  const rawThreads = useMemo(() => data?.threads ?? [], [data?.threads]);
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Extract unique properties for filtering
  const uniqueProperties = useMemo(() => {
    const set = new Set<string>();
    for (const t of rawThreads) {
      if (t.property) set.add(t.property);
    }
    return Array.from(set).sort();
  }, [rawThreads]);

  // Compute metrics
  const needsReplyCount = useMemo(() => {
    return rawThreads.filter((t) => t.lastSenderRole === "guest").length;
  }, [rawThreads]);

  const repliedCount = useMemo(() => {
    return rawThreads.filter((t) => t.lastSenderRole === "host").length;
  }, [rawThreads]);

  // Filter threads
  const filteredThreads = useMemo(() => {
    return rawThreads.filter((t) => {
      // Status filter
      if (statusFilter === "needs_reply" && t.lastSenderRole !== "guest") return false;
      if (statusFilter === "replied" && t.lastSenderRole !== "host") return false;

      // Property filter
      if (propertyFilter !== "all" && t.property !== propertyFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.guestName.toLowerCase().includes(q);
        const matchProp = t.property.toLowerCase().includes(q);
        const matchRef = t.bookingReference.toLowerCase().includes(q);
        const matchBody = t.lastMessageBody.toLowerCase().includes(q);
        if (!matchName && !matchProp && !matchRef && !matchBody) return false;
      }

      return true;
    });
  }, [rawThreads, statusFilter, propertyFilter, searchQuery]);

  // Auto-select first thread if none selected or if selection no longer valid
  useEffect(() => {
    if (rawThreads.length > 0 && !selectedBookingId) {
      setSelectedBookingId(rawThreads[0]!.bookingId);
    }
  }, [rawThreads, selectedBookingId]);

  const activeThread = useMemo(() => {
    return rawThreads.find((t) => t.bookingId === selectedBookingId) || null;
  }, [rawThreads, selectedBookingId]);

  function handleCopyReference(e: React.MouseEvent, ref: string) {
    e.stopPropagation();
    e.preventDefault();
    void navigator.clipboard.writeText(ref);
    setCopiedId(ref);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleManualRefresh() {
    setIsRefreshing(true);
    await refresh(true);
    setIsRefreshing(false);
  }

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[440px] gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
          <p className="text-sm font-medium text-gray-600">Loading your inbox...</p>
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-4 sm:space-y-5">
        {/* Top Header & Metrics Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-display">
                Messages
              </h1>
              {needsReplyCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {needsReplyCount} awaiting reply
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  All caught up
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Direct guest messaging hub. View booking context, arrival dates, and reply in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200/90 px-3.5 py-2 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-2xs disabled:opacity-60"
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5 text-gray-500",
                  isRefreshing && "animate-spin text-emerald-600"
                )}
              />
              Refresh inbox
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refresh(true)}
              className="text-xs font-semibold underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Master-Detail Split Inbox Hub */}
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden min-h-[580px] h-[calc(100vh-210px)] max-h-[880px] flex flex-col lg:flex-row">
          {/* Left Column: Conversation Directory */}
          <div
            className={cn(
              "w-full lg:w-[380px] xl:w-[410px] flex-col border-r border-gray-200 bg-white shrink-0 min-w-0",
              mobilePane === "chat" ? "hidden lg:flex" : "flex"
            )}
          >
            {/* Search & Filter Header */}
            <div className="p-3.5 border-b border-gray-100 space-y-2.5 bg-gray-50/40">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guest, property, reference..."
                  className="w-full text-xs sm:text-sm pl-9 pr-8 py-2 rounded-xl bg-white border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all placeholder:text-gray-400 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs & Property Dropdown */}
              <div className="flex items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1 bg-gray-200/50 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all text-xs",
                      statusFilter === "all"
                        ? "bg-white text-gray-950 shadow-2xs font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    All ({rawThreads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("needs_reply")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all text-xs flex items-center gap-1",
                      statusFilter === "needs_reply"
                        ? "bg-white text-gray-950 shadow-2xs font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <span>Needs reply</span>
                    {needsReplyCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("replied")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-all text-xs",
                      statusFilter === "replied"
                        ? "bg-white text-gray-950 shadow-2xs font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Replied ({repliedCount})
                  </button>
                </div>

                {/* Property Dropdown (if multiple properties exist) */}
                {uniqueProperties.length > 1 && (
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="text-xs bg-white border border-gray-200 text-gray-700 py-1 px-2 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 max-w-[130px] truncate shadow-2xs"
                  >
                    <option value="all">All properties</option>
                    {uniqueProperties.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Conversation Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-gray-800">No conversations found</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                    {searchQuery
                      ? "No messages match your search filter. Try clearing your search query."
                      : "Booking conversations will appear here once guests send a message."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setPropertyFilter("all");
                      }}
                      className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = activeThread?.bookingId === thread.bookingId;
                  const isUnanswered = thread.lastSenderRole === "guest";
                  const seedStyle = getSeedStyle(
                    `${thread.property}-${thread.bookingReference}`
                  );
                  const displayName = formatDisplayName(thread.guestName);
                  const initials = getInitials(thread.guestName);
                  const stayContext = getStayContext(thread.checkIn, thread.checkOut);

                  return (
                    <div
                      key={thread.bookingId}
                      onClick={() => {
                        setSelectedBookingId(thread.bookingId);
                        setMobilePane("chat");
                      }}
                      className={cn(
                        "p-4 cursor-pointer transition-all relative border-l-4 text-left select-none group",
                        isSelected
                          ? "bg-gradient-to-r from-emerald-50/70 via-emerald-50/30 to-white border-l-emerald-700"
                          : "border-l-transparent hover:bg-gray-50/80"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Visual Landmark: Property Thumbnail or Property Initial with Guest Badge */}
                        <div className="relative shrink-0 select-none">
                          {thread.propertyPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thread.propertyPhoto}
                              alt={thread.property}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-2xs"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm border shadow-2xs",
                                seedStyle.bg,
                                seedStyle.text
                              )}
                            >
                              <Home className="w-5 h-5 text-current" />
                            </div>
                          )}

                          {/* Mini Guest Badge in Corner */}
                          <div
                            className={cn(
                              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-xs",
                              isUnanswered ? "bg-amber-500 text-white" : "bg-emerald-700 text-white"
                            )}
                            title={`Guest: ${displayName}`}
                          >
                            {initials.slice(0, 1)}
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="min-w-0 flex-1">
                          {/* Row 1: Property Name (Hero) & Timestamp */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-sm text-gray-950 truncate group-hover:text-emerald-900 transition-colors">
                              {thread.property}
                            </span>
                            <time
                              className="text-[11px] text-gray-400 shrink-0 font-medium whitespace-nowrap"
                              title={new Date(thread.lastMessageAt).toLocaleString()}
                            >
                              {formatRelativeTime(thread.lastMessageAt)}
                            </time>
                          </div>

                          {/* Row 2: Guest Name & Stay Dates */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5 truncate">
                            <span className="font-semibold text-gray-900 truncate">
                              {displayName}
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="text-gray-500 whitespace-nowrap">
                              {formatBookingDate(thread.checkIn)}
                              {stayContext.nights ? ` (${stayContext.nights}n)` : ""}
                            </span>
                          </div>

                          {/* Row 3: Message snippet preview */}
                          <p
                            className={cn(
                              "text-xs mt-1.5 line-clamp-1 leading-relaxed",
                              isUnanswered
                                ? "text-gray-950 font-medium"
                                : "text-gray-500"
                            )}
                          >
                            {thread.lastSenderRole === "host" && (
                              <span className="text-gray-400 font-normal mr-1">You:</span>
                            )}
                            {thread.lastMessageBody}
                          </p>

                          {/* Row 4: Stay Badge, Booking Ref & Reply Status */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1 border-t border-gray-100/60">
                            {/* Stay status pill */}
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.2 rounded-md border whitespace-nowrap",
                                stayContext.badgeStyle
                              )}
                            >
                              {stayContext.label}
                            </span>

                            {/* Booking Reference Pill */}
                            <span
                              onClick={(e) => handleCopyReference(e, thread.bookingReference)}
                              className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 inline-flex items-center gap-1 transition-colors border border-gray-200/60"
                              title="Click to copy booking reference"
                            >
                              <span>{thread.bookingReference}</span>
                              {copiedId === thread.bookingReference ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-gray-400 group-hover:text-gray-600" />
                              )}
                            </span>

                            {/* Unanswered or Replied Indicator */}
                            <div className="ms-auto">
                              {isUnanswered ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Needs reply
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  Replied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {total > pageSize && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Page {page} of {totalPages} · {total} conversations
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Conversation & Instant Reply Hub */}
          <div
            className={cn(
              "flex-1 flex-col bg-[#fbfdfa] min-w-0 h-full",
              mobilePane === "list" ? "hidden lg:flex" : "flex"
            )}
          >
            {activeThread ? (
              <ConversationPane
                thread={activeThread}
                user={user}
                onBack={() => setMobilePane("list")}
                onMessageSent={() => {
                  void refresh(true);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 shadow-2xs">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900 font-display">
                  Select a conversation
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Choose a conversation from the left to read previous messages and reply directly to your guest.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </HostDashboardShell>
  );
}

// --- Active Thread Conversation Component ---
interface ConversationPaneProps {
  thread: HostMessageInboxRow;
  user: ReturnType<typeof useAuth>["user"];
  onBack: () => void;
  onMessageSent: () => void;
}

function ConversationPane({
  thread,
  user,
  onBack,
  onMessageSent,
}: ConversationPaneProps) {
  const { messages, ready, sending, send } = useBookingMessages(thread.bookingId);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formId = useId();

  const seedStyle = getSeedStyle(`${thread.property}-${thread.bookingReference}`);
  const displayName = formatDisplayName(thread.guestName);
  const initials = getInitials(thread.guestName);
  const stayContext = getStayContext(thread.checkIn, thread.checkOut);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || draft).trim();
    if (!text || sending) return;

    setSendError(null);
    try {
      await send({
        body: text,
        senderRole: "host",
        senderId: user?.id || "host",
        senderName: user?.fullName || "Host",
      });
      setDraft("");
      onMessageSent();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  }

  function handleCopyBookingRef() {
    void navigator.clipboard.writeText(thread.bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Thread Header with Guest & Stay Context */}
      <div className="px-4 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Back to all conversations"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Property Thumbnail or Icon */}
          <div className="relative shrink-0 select-none">
            {thread.propertyPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.propertyPhoto}
                alt={thread.property}
                className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-2xs"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs border shadow-2xs",
                  seedStyle.bg,
                  seedStyle.text
                )}
              >
                <Home className="w-5 h-5 text-current" />
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-emerald-700 text-white border-2 border-white shadow-xs"
              title={`Guest: ${displayName}`}
            >
              {initials.slice(0, 1)}
            </div>
          </div>

          {/* Property Title & Guest Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-950 text-sm sm:text-base truncate">
                {thread.property}
              </h2>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap hidden sm:inline-block",
                  stayContext.badgeStyle
                )}
              >
                {stayContext.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span className="font-semibold text-gray-800">
                Guest: {displayName}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                {formatBookingDate(thread.checkIn)}
                {thread.checkOut ? ` → ${formatBookingDate(thread.checkOut)}` : ""}
              </span>
              {thread.guestCount && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    {thread.guestCount} {thread.guestCount === 1 ? "guest" : "guests"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Booking Link */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Copy Reference */}
          <button
            type="button"
            onClick={handleCopyBookingRef}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs"
            title="Copy booking reference"
          >
            <span>{thread.bookingReference}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>

          {/* Full Booking Detail Link */}
          <Link
            href={`/host/bookings/${encodeURIComponent(thread.bookingId)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <span>Booking details</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
          </Link>
        </div>
      </div>

      {/* Message Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8faf7]/50">
        {!ready ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="font-semibold text-gray-800">No messages in this booking yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Start the conversation by greeting {displayName} with arrival details.
            </p>
          </div>
        ) : (
          messages.map((m, index) => {
            const isHost = m.senderRole === "host";
            const isAdmin = m.senderRole === "admin";
            const isGuest = m.senderRole === "guest";

            // Date divider check
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg ||
              new Date(m.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

            return (
              <div key={m.id} className="space-y-3">
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-white border border-gray-200/80 px-2.5 py-0.5 rounded-full text-gray-500 shadow-2xs">
                      {formatDateDivider(m.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "flex flex-col max-w-[85%] sm:max-w-[75%]",
                    isHost ? "ms-auto items-end" : "me-auto items-start"
                  )}
                >
                  {/* Sender Name & Role indicator */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-medium text-gray-600">
                      {isHost ? "You (Host)" : formatDisplayName(m.senderName)}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded-full">
                        <Shield className="w-2.5 h-2.5 text-amber-700" />
                        Admin
                      </span>
                    )}
                    {isGuest && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-full">
                        Guest
                      </span>
                    )}
                  </div>

                  {/* Speech Bubble */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-2xs whitespace-pre-wrap break-words",
                      isHost
                        ? "bg-[#1a4731] text-white/95 rounded-br-xs"
                        : isAdmin
                          ? "bg-amber-50 text-amber-950 border border-amber-200 rounded-bl-xs"
                          : "bg-white text-gray-900 border border-gray-200/90 rounded-bl-xs"
                    )}
                  >
                    {m.body}
                  </div>

                  {/* Message Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1 font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTimeOnly(m.createdAt)}</span>
                    {isHost && <CheckCheck className="w-3 h-3 text-emerald-600 ml-0.5" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Suggestion Chips */}
      <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Quick reply:
        </span>
        {QUICK_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.label}
            type="button"
            onClick={() => setDraft(tmpl.text)}
            className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 transition-colors whitespace-nowrap border border-gray-200/70 shrink-0 shadow-2xs"
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      {/* Message Composer Footer */}
      <div className="p-3.5 border-t border-gray-200 bg-white shrink-0">
        {sendError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg mb-2">
            {sendError}
          </p>
        )}

        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write a reply to ${displayName}... (Enter to send, Shift + Enter for new line)`}
              className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 resize-none transition-all placeholder:text-gray-400 bg-gray-50/40 focus:bg-white shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Send reply (Enter)"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-1.5 px-1 flex items-center justify-between">
          <span>Replies are visible to the guest and platform support.</span>
          <span className="hidden sm:inline">Press Enter to send</span>
        </p>
      </div>
    </div>
  );
}
