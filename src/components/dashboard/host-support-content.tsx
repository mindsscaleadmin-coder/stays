"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId, resolveHostName } from "@/lib/listings/use-listing-submissions";
import { useHostSupport } from "@/lib/host/use-host-support";
import { useCountrySupportContact } from "@/lib/admin/use-country-support-contact";
import { useHostStaffAccess } from "@/lib/host/use-host-staff-access";
import { useHostBookings } from "@/lib/host/use-host-bookings";
import type { SupportTicketPriority } from "@/lib/host/host-support-types";
import { cn } from "@/lib/utils";

type TicketCategory =
  | "payouts"
  | "booking"
  | "dispute"
  | "listing"
  | "staff"
  | "urgent"
  | "other";

interface CategoryMeta {
  id: TicketCategory;
  label: string;
  icon: typeof CreditCard;
  recommendedPriority: SupportTicketPriority;
  subjectHint: string;
  messagePlaceholder: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "payouts",
    label: "Payouts & Finance",
    icon: CreditCard,
    recommendedPriority: "high",
    subjectHint: "Delayed payout / Commission query",
    messagePlaceholder:
      "Please describe the payout issue, include payout cycle or expected transfer date, and your bank account reference if needed…",
  },
  {
    id: "booking",
    label: "Bookings & Dates",
    icon: Calendar,
    recommendedPriority: "normal",
    subjectHint: "Booking modification / Date adjustment",
    messagePlaceholder:
      "Include the booking reference (e.g. GF-M9O2T4), guest name, requested check-in / check-out changes, or availability concern…",
  },
  {
    id: "dispute",
    label: "Guest Issue & Dispute",
    icon: ShieldAlert,
    recommendedPriority: "high",
    subjectHint: "House rules breach / Property damage report",
    messagePlaceholder:
      "Detail the incident with the guest, check-in dates, photographic evidence availability, and steps you have already taken…",
  },
  {
    id: "listing",
    label: "Listing & Verification",
    icon: Building2,
    recommendedPriority: "normal",
    subjectHint: "Listing approval / Photo update / KYC update",
    messagePlaceholder:
      "Tell us what needs updating on your listing, trade license / KYC documentation, or address clarification…",
  },
  {
    id: "staff",
    label: "Staff & Team Access",
    icon: UserCog,
    recommendedPriority: "normal",
    subjectHint: "Staff permission / New manager invite problem",
    messagePlaceholder:
      "Provide the staff member's email address, role (Manager or Staff), and specific permission or sign-in issue…",
  },
  {
    id: "urgent",
    label: "Urgent Stay Incident",
    icon: AlertTriangle,
    recommendedPriority: "critical",
    subjectHint: "Active guest emergency / Immediate check-in block",
    messagePlaceholder:
      "Describe the urgent emergency happening right now at the property. For medical or life safety, contact local emergency services first…",
  },
];

const FAQS = [
  {
    question: "When are host payouts processed and transferred to my account?",
    answer:
      "Platform payouts are automatically initiated within 24 to 48 hours following a verified guest check-in. Bank transfers typically settle within 1–2 business days. You can track all incoming transfers and download official statements in the Accounts section.",
    href: "/host/accounts",
    hrefLabel: "Open Host Accounts & Payouts",
  },
  {
    question: "What is the procedure if a guest damages the property or violates rules?",
    answer:
      "1. Document the incident with photos and timestamps immediately. 2. Record a note under the booking dispute log. 3. Raise a ticket here under 'Guest Issue & Dispute' with Priority set to High or Critical so the Super Admin operations team can mediate and retain or adjust deposits.",
    href: "/host/bookings",
    hrefLabel: "View Recent Bookings",
  },
  {
    question: "Can on-site staff members contact Super Admin support directly?",
    answer:
      "Yes! Any staff member granted the 'Support' (manage_support) permission by the property owner can access this desk, view ticket updates, and submit requests directly to the platform team under their own verified profile.",
    href: "/host/staff",
    hrefLabel: "Manage Staff Permissions",
  },
  {
    question: "How do I report a double-booking or calendar synchronization failure?",
    answer:
      "Immediately raise a ticket categorized under 'Bookings & Dates' with High Priority, specifying the overlapping dates and booking references. Our operations team can adjust availability or re-accommodate guests in emergency cases.",
    href: "/host/calendar",
    hrefLabel: "Open Property Calendar",
  },
];

export function HostSupportContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { data, ready, submitTicket } = useHostSupport(hostId, hostName);
  const { phone, whatsapp, hoursLabel, telHref } = useCountrySupportContact();
  const { member, roleLabel, isOwner } = useHostStaffAccess();
  const { bookings } = useHostBookings();

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>("payouts");
  const [priority, setPriority] = useState<SupportTicketPriority>("high");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [property, setProperty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Ticket list filter & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Current category metadata
  const currentCategoryMeta = useMemo(() => {
    return CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  }, [selectedCategory]);

  // Fallback contact info
  const effectivePhone = phone || "+971 800 FARM (3276)";
  const effectiveTelHref = telHref || "tel:+9718003276";
  const effectiveHours = hoursLabel || "Sun–Thu, 9 AM – 6 PM GST · English & Arabic";
  const effectiveWhatsAppNumber = whatsapp || "+971 50 123 4567";

  const prefilledWhatsAppHref = useMemo(() => {
    const rawNumber = effectiveWhatsAppNumber.replace(/[^0-9]/g, "");
    const submitter = member?.name || user?.fullName || "Host";
    const role = roleLabel || (isOwner ? "Owner" : "Host Staff");
    const text = encodeURIComponent(
      `Hello Greenfield Super Admin Support Team,\n\nI am ${submitter} (${role}) managing properties on Farm Stays. I need assistance with our host account.\n\nHost ID: ${hostId || "N/A"}`
    );
    return `https://wa.me/${rawNumber}?text=${text}`;
  }, [effectiveWhatsAppNumber, member?.name, user?.fullName, roleLabel, isOwner, hostId]);

  function handleSelectCategory(cat: TicketCategory) {
    setSelectedCategory(cat);
    const meta = CATEGORIES.find((c) => c.id === cat);
    if (meta) {
      setPriority(meta.recommendedPriority);
      if (!subject.trim()) {
        setSubject(meta.subjectHint);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const categoryTag = currentCategoryMeta.label;
      const fullSubject = subject.trim();
      const fullMessage = message.trim();

      submitTicket({
        subject: `[${categoryTag}] ${fullSubject}`,
        message: fullMessage,
        priority,
        bookingRef: bookingRef.trim() || undefined,
        property: property.trim() || undefined,
        requesterEmail: user?.email || undefined,
      });

      setSubject("");
      setMessage("");
      setBookingRef("");
      setProperty("");
      setFlash({
        type: "success",
        text: "Your support ticket has been dispatched directly to the Super Admin team. Our operations desk will review and update your request shortly.",
      });
      setTimeout(() => setFlash(null), 6000);
    } catch {
      setFlash({
        type: "error",
        text: "Failed to submit ticket. Please try again or use direct WhatsApp / Phone.",
      });
      setTimeout(() => setFlash(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    if (!data?.tickets) return [];
    return data.tickets.filter((t) => {
      // Status filter
      if (statusFilter === "active") {
        if (t.status === "resolved" || t.status === "closed") return false;
      } else if (statusFilter === "resolved") {
        if (t.status !== "resolved" && t.status !== "closed") return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = t.subject.toLowerCase().includes(query);
        const matchesMessage = t.message.toLowerCase().includes(query);
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesRef = t.bookingRef?.toLowerCase().includes(query);
        return matchesSubject || matchesMessage || matchesId || matchesRef;
      }
      return true;
    });
  }, [data?.tickets, statusFilter, searchQuery]);

  const activeCount = useMemo(() => {
    if (!data?.tickets) return 0;
    return data.tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  }, [data?.tickets]);

  const resolvedCount = useMemo(() => {
    if (!data?.tickets) return 0;
    return data.tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  }, [data?.tickets]);

  if (!ready || !data) {
    return (
      <HostDashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[360px] gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-green-700" />
          <p className="text-sm font-medium text-gray-500">Connecting to Host Support Desk…</p>
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Top Header & Status Banner */}
        <div className="bg-gradient-to-r from-[#123d2d] via-[#174a36] to-[#1e5842] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
            <LifeBuoy className="w-96 h-96 -mr-20 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-green-200 text-xs font-semibold backdrop-blur-sm border border-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Super Admin & Platform Operations Desk</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
                Host & Staff Support Desk
              </h1>
              <p className="text-green-100/85 text-sm sm:text-base leading-relaxed">
                Direct channel for property hosts, managers, and on-site staff to request
                immediate assistance, resolve guest disputes, dispute payouts, and connect with
                Greenfield Super Admin.
              </p>
            </div>

            {/* Submitter & Desk Status Pill */}
            <div className="bg-black/25 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shrink-0 min-w-[240px]">
              <div className="flex items-center gap-2 text-xs text-green-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-white">Super Admin Desk Online</span>
              </div>
              <div className="text-xs border-t border-white/10 pt-2 text-green-100/80 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>
                    {member?.name || user?.fullName || "Host Partner"} (
                    {roleLabel || (isOwner ? "Owner" : "Staff")})
                  </span>
                </div>
                <div className="text-[11px] text-green-200/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Avg response: under 2 hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Contact Cards (One-Click Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: WhatsApp Direct Desk */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Instant Chat
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Super Admin WhatsApp</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Direct message desk for urgent questions, check-in updates, and photo exchanges.
                </p>
              </div>
              <p className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50/60 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                {effectiveWhatsAppNumber}
              </p>
            </div>

            <div className="pt-4 mt-2">
              <a
                href={prefilledWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-sm hover:shadow transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Card 2: Voice Support Line */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700 group-hover:scale-105 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-800 bg-green-50 px-2 py-0.5 rounded-full border border-green-200/60">
                  Priority Hotline
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Host & Staff Phone Desk</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Speak directly with platform operations for real-time check-in or booking support.
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{effectiveHours}</span>
              </p>
            </div>

            <div className="pt-4 mt-2">
              <a
                href={effectiveTelHref}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#123d2d] hover:bg-[#184f3a] text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-sm hover:shadow transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call {effectivePhone}</span>
              </a>
            </div>
          </div>

          {/* Card 3: Formal Operations Email */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  Formal Desk
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Super Admin Operations Email</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Official correspondence, bank details verification, contracts, and legal disputes.
                </p>
              </div>
              <p className="text-xs font-mono font-semibold text-blue-900 bg-blue-50/60 px-2.5 py-1.5 rounded-lg border border-blue-100">
                support@greenfield.ae
              </p>
            </div>

            <div className="pt-4 mt-2">
              <a
                href={`mailto:support@greenfield.ae?subject=${encodeURIComponent(`[Host Support] Request from ${hostName || hostId || "Host Partner"}`)}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-sm hover:shadow transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>Send Official Email</span>
              </a>
            </div>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {flash && (
          <div
            className={cn(
              "rounded-2xl p-4 sm:p-5 border flex items-start gap-3 shadow-sm transition-all",
              flash.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            )}
          >
            {flash.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {flash.type === "success" ? "Ticket Submitted Successfully" : "Submission Notice"}
              </p>
              <p className="text-xs sm:text-sm text-opacity-90">{flash.text}</p>
            </div>
          </div>
        )}

        {/* Main 2-Column Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1 (Left 7 Cols): Raise a Request Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#123d2d]/10 flex items-center justify-center text-[#123d2d]">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 font-display">
                      Raise a Support Request
                    </h2>
                    <p className="text-xs text-gray-500">
                      Dispatched instantly to the Super Admin ticketing queue
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  Submitting as: <strong className="text-gray-900">{roleLabel || (isOwner ? "Owner" : "Staff")}</strong>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Category Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2.5">
                    1. Select Topic Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-green-50/80 border-green-600 text-green-950 shadow-sm ring-1 ring-green-600"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4 mb-1.5",
                              isSelected ? "text-green-700" : "text-gray-400"
                            )}
                          />
                          <span className="text-xs font-bold leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Priority Level */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      2. Urgency & Priority Level
                    </label>
                    <span className="text-[11px] text-gray-400">
                      Recommended: <span className="capitalize font-semibold text-gray-700">{currentCategoryMeta.recommendedPriority}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "normal", label: "Normal", desc: "Within 24h", tone: "blue" },
                        { id: "high", label: "High", desc: "Within 4h", tone: "amber" },
                        { id: "critical", label: "Critical", desc: "Immediate", tone: "rose" },
                      ] as const
                    ).map((p) => {
                      const isSelected = priority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-center transition-all",
                            isSelected
                              ? p.id === "critical"
                                ? "bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500 font-bold"
                                : p.id === "high"
                                  ? "bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500 font-bold"
                                  : "bg-blue-50 border-blue-600 text-blue-950 ring-1 ring-blue-600 font-bold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <div className="text-xs font-bold">{p.label}</div>
                          <div className="text-[10px] opacity-75">{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Optional Reference Fields (Booking Ref & Property) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Related Booking Ref <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value)}
                        placeholder="e.g. GF-M9O2T4"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent uppercase"
                      />
                      {bookings.length > 0 && !bookingRef && (
                        <div className="mt-1 flex items-center gap-1 overflow-x-auto text-[10px] text-gray-500 pb-0.5">
                          <span>Recent:</span>
                          {bookings.slice(0, 2).map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setBookingRef(b.bookingReference || b.id)}
                              className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-mono"
                            >
                              {b.bookingReference || b.id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Property / Stay Title <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                      placeholder="e.g. Desert Palm Farmhouse"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 4. Subject */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={currentCategoryMeta.subjectHint}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                {/* 5. Detailed Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Message & Details
                    </label>
                    <span className="text-[11px] text-gray-400">
                      {message.length} characters
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={currentCategoryMeta.messagePlaceholder}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-y min-h-[110px]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    💡 Include specific guest names, transaction IDs, or photos on WhatsApp if applicable.
                  </p>
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct submission to Super Admin queue</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                    className="inline-flex items-center justify-center gap-2 bg-[#123d2d] hover:bg-[#184f3a] disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Ticket to Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Column 2 (Right 5 Cols): Ticket History & Communication Logs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-700" />
                  <h3 className="font-bold text-gray-900 text-base">Your Support Tickets</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                    {activeCount} Active
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    {resolvedCount} Resolved
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg transition-all",
                      statusFilter === "all"
                        ? "bg-white text-gray-900 font-bold shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    All ({data.tickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg transition-all",
                      statusFilter === "active"
                        ? "bg-white text-gray-900 font-bold shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Active ({activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("resolved")}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg transition-all",
                      statusFilter === "resolved"
                        ? "bg-white text-gray-900 font-bold shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    Resolved ({resolvedCount})
                  </button>
                </div>

                {data.tickets.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tickets by ID or keyword…"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-green-600"
                    />
                  </div>
                )}
              </div>

              {/* Ticket Cards List */}
              {filteredTickets.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-gray-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No tickets found</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    {searchQuery
                      ? "No tickets match your search query."
                      : "You have no active support tickets in this view. Use the form on the left to raise a request."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {filteredTickets.map((t) => {
                    const isExpanded = expandedTicketId === t.id;
                    const logs = t.communicationLogs || [];
                    const isClosed = t.status === "resolved" || t.status === "closed";

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "border rounded-2xl p-4 transition-all bg-white",
                          isExpanded
                            ? "border-green-600 shadow-md ring-1 ring-green-600/30"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        )}
                      >
                        <div
                          className="cursor-pointer space-y-2"
                          onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                        >
                          {/* Badges line */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {t.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Priority badge */}
                              {t.priority && (
                                <span
                                  className={cn(
                                    "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded",
                                    t.priority === "critical"
                                      ? "bg-rose-100 text-rose-800"
                                      : t.priority === "high"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                  )}
                                >
                                  {t.priority}
                                </span>
                              )}
                              {/* Status badge */}
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1",
                                  t.status === "open" && "bg-blue-100 text-blue-700",
                                  t.status === "in_progress" && "bg-amber-100 text-amber-700",
                                  t.status === "escalated" && "bg-purple-100 text-purple-700",
                                  isClosed && "bg-emerald-100 text-emerald-700"
                                )}
                              >
                                {t.status === "in_progress" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                )}
                                {t.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          {/* Subject & snippet */}
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-snug">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                              {t.message}
                            </p>
                          </div>

                          {/* Footer metadata */}
                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                              <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                              {t.bookingRef && (
                                <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                                  {t.bookingRef}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-green-700 font-semibold text-[11px]">
                              <span>{isExpanded ? "Hide Details" : "View Thread"}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details & communication history */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-3.5 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5">
                              <p className="font-bold text-gray-700">Full Description:</p>
                              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {t.message}
                              </p>
                              {t.property && (
                                <p className="text-[11px] text-gray-500 pt-1">
                                  Property: <span className="font-semibold text-gray-700">{t.property}</span>
                                </p>
                              )}
                            </div>

                            {/* Admin Staff responses & timeline */}
                            <div className="space-y-2">
                              <p className="font-bold text-gray-700 flex items-center justify-between">
                                <span>Support Timeline & Admin Notes</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  {logs.length} update{logs.length !== 1 ? "s" : ""}
                                </span>
                              </p>

                              {logs.length === 0 ? (
                                <p className="text-gray-500 italic bg-gray-50/80 p-2.5 rounded-xl border text-[11px]">
                                  Ticket has been queued and assigned to the Super Admin desk. You will receive updates here or via WhatsApp.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {logs.map((log) => (
                                    <div
                                      key={log.id}
                                      className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl space-y-1"
                                    >
                                      <div className="flex items-center justify-between text-[10px] text-emerald-800 font-medium">
                                        <span className="font-bold">
                                          {log.staffName || "Super Admin Team"}
                                        </span>
                                        <span>{new Date(log.at).toLocaleString()}</span>
                                      </div>
                                      <p className="text-gray-800 text-[11px] leading-relaxed">
                                        {log.summary}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Quick follow up */}
                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100 text-[11px]">
                              <span className="text-gray-500">Need urgent follow-up on this?</span>
                              <a
                                href={prefilledWhatsAppHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Quote #{t.id} on WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Links / Self-Service Card */}
            <div className="bg-[#123d2d]/5 rounded-3xl border border-[#123d2d]/15 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#123d2d]">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-bold text-sm">Quick Operations Shortcuts</h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Most operational tasks can be completed directly through your host dashboard:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-semibold">
                <Link
                  href="/host/accounts"
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#123d2d] transition-colors text-gray-800 flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5 text-green-700" />
                  <span>Check Payouts</span>
                </Link>
                <Link
                  href="/host/staff"
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#123d2d] transition-colors text-gray-800 flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-green-700" />
                  <span>Manage Staff</span>
                </Link>
                <Link
                  href="/host/bookings"
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#123d2d] transition-colors text-gray-800 flex items-center gap-2"
                >
                  <Calendar className="w-3.5 h-3.5 text-green-700" />
                  <span>Stay Bookings</span>
                </Link>
                <Link
                  href="/host/calendar"
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-[#123d2d] transition-colors text-gray-800 flex items-center gap-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-green-700" />
                  <span>Block Dates</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs & Knowledge Base Accordion */}
        <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <HelpCircle className="w-5 h-5 text-green-700" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 font-display">
                Frequently Asked Support Questions
              </h3>
              <p className="text-xs text-gray-500">
                Quick answers to the most common host and property operations inquiries
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaqIndex === idx;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 font-semibold text-sm text-gray-900 hover:text-green-800 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-green-700 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed pr-6 space-y-2">
                      <p>{faq.answer}</p>
                      {faq.href && (
                        <Link
                          href={faq.href}
                          className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-900 underline"
                        >
                          <span>{faq.hrefLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </HostDashboardShell>
  );
}
