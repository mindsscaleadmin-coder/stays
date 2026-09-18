"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCheck,
  CreditCard,
  Flag,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Server,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { useAdminAlerts } from "@/lib/admin/use-admin-alerts";
import type { AdminAlert, AdminAlertCategory } from "@/lib/admin/admin-alerts-types";
import {
  ADMIN_ALERT_CATEGORY_LABELS,
  ADMIN_ALERT_CURRENCY,
  countUnreadByCategory,
} from "@/lib/admin/admin-alerts-data";
import { cn } from "@/lib/utils";

type TabId = "all" | AdminAlertCategory | "settings";

const SECTIONS: {
  id: Exclude<TabId, "settings">;
  label: string;
  description: string;
  icon: typeof Bell;
  accent: string;
  iconBg: string;
}[] = [
  {
    id: "all",
    label: "All notifications",
    description: "Everything in one place",
    icon: Bell,
    accent: "border-gray-200 hover:border-gray-300",
    iconBg: "bg-gray-100 text-gray-700",
  },
  {
    id: "host_payment",
    label: "Host payments",
    description: "Promote & Featured purchases",
    icon: Megaphone,
    accent: "border-violet-200 hover:border-violet-300",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    id: "host_signup",
    label: "Host signups",
    description: "New host registrations",
    icon: UserPlus,
    accent: "border-blue-200 hover:border-blue-300",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    id: "flagged_content",
    label: "Flagged content",
    description: "Listings & reviews to review",
    icon: Flag,
    accent: "border-orange-200 hover:border-orange-300",
    iconBg: "bg-orange-100 text-orange-700",
  },
  {
    id: "high_value_tx",
    label: "High-value / fraud",
    description: "Large bookings & payouts",
    icon: Wallet,
    accent: "border-emerald-200 hover:border-emerald-300",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "system_health",
    label: "System health",
    description: "Gateway, email, SMS status",
    icon: Server,
    accent: "border-red-200 hover:border-red-300",
    iconBg: "bg-red-100 text-red-700",
  },
];

const SECTION_WIRING: Record<Exclude<TabId, "settings">, string> = {
  all:
    "Unified feed from host signups, listing queue, trust reviews, high-value bookings, promote payments, and system toggles. Read/dismiss state persists in Shared DB when enabled.",
  host_payment:
    "Live from host Promote purchases (Trending / Featured). Each payment creates an alert with a link to Advertisements admin.",
  host_signup:
    "New hosts within your signup window from the user registry. Open host profiles for KYC and directory onboarding.",
  flagged_content:
    "Pending listings, flagged listings, and flagged guest reviews from listing submissions and Reviews & Trust.",
  high_value_tx:
    `Bookings and ledger rows at or above the fraud threshold (${ADMIN_ALERT_CURRENCY}). Critical severity at 2× threshold. Opens Financial → Transactions.`,
  system_health:
    "Simulated payment gateway, email, and SMS status. Degraded or down services generate alerts until restored.",
};

const CATEGORY_ICONS: Record<AdminAlertCategory, React.ComponentType<{ className?: string }>> = {
  host_signup: UserPlus,
  flagged_content: Flag,
  high_value_tx: Wallet,
  system_health: Server,
  host_payment: Megaphone,
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function AlertCard({
  alert,
  onRead,
  onDismiss,
}: {
  alert: AdminAlert;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const Icon = CATEGORY_ICONS[alert.category];

  return (
    <article
      className={cn(
        "bg-white rounded-2xl border p-4 sm:p-5 transition-colors",
        !alert.read && "border-green-200 bg-green-50/30",
        alert.severity === "critical" && !alert.read && "border-red-200 bg-red-50/20"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              alert.category === "host_payment"
                ? "bg-violet-100 text-violet-700"
                : alert.severity === "critical"
                  ? "bg-red-100 text-red-700"
                  : alert.severity === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {ADMIN_ALERT_CATEGORY_LABELS[alert.category]}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                  SEVERITY_STYLES[alert.severity]
                )}
              >
                {alert.severity}
              </span>
              {!alert.read && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  New
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Date(alert.createdAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {alert.href && (
            <Link
              href={alert.href}
              onClick={onRead}
              className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg"
            >
              View
            </Link>
          )}
          {!alert.read && (
            <button
              type="button"
              onClick={onRead}
              className="text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Dismiss
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminAlertsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParamRaw = searchParams.get("tab");
  const tabParam = (tabParamRaw === "system" ? "system_health" : tabParamRaw) as TabId | null;
  const validTabs: TabId[] = [
    "all",
    "host_payment",
    "host_signup",
    "flagged_content",
    "high_value_tx",
    "system_health",
    "settings",
  ];
  const activeTab: TabId = tabParam && validTabs.includes(tabParam) ? tabParam : "all";

  const {
    ready,
    shared,
    alerts,
    settings,
    dismissedCount,
    unreadCount,
    criticalCount,
    refresh,
    markRead,
    markAllRead,
    dismiss,
    saveSettings,
    setServiceStatus,
  } = useAdminAlerts();

  const [message, setMessage] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/alerts?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const unreadByCategory = useMemo(() => countUnreadByCategory(alerts), [alerts]);

  const enabledCategoryCount = useMemo(
    () => Object.values(settings.enabledCategories).filter(Boolean).length,
    [settings.enabledCategories]
  );

  const systemIssueCount = useMemo(
    () =>
      (["paymentGateway", "emailService", "smsService"] as const).filter(
        (key) => settings.systemHealth[key] !== "operational"
      ).length,
    [settings.systemHealth]
  );

  const filteredAlerts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (showUnreadOnly && a.read) return false;
      if (activeTab !== "all" && activeTab !== "settings" && a.category !== activeTab) {
        return false;
      }
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        ADMIN_ALERT_CATEGORY_LABELS[a.category].toLowerCase().includes(q)
      );
    });
  }, [alerts, activeTab, showUnreadOnly, query]);

  const activeSection = SECTIONS.find((s) => s.id === activeTab);

  if (!ready) {
    return (
              <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">
              Notifications & Alerts
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              India launch — host payments, signups, moderation flags, high-value bookings, and
              system health in one feed. Alerts derive from live admin data; read/dismiss state
              syncs when Shared DB is on.
              {unreadCount > 0 && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  {unreadCount} unread
                  {criticalCount > 0 && ` · ${criticalCount} critical`}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                refresh();
                flash("Alerts refreshed.");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={cn(
                "text-xs font-semibold border px-3 py-2 rounded-lg",
                activeTab === "settings"
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-gray-200 text-gray-700 hover:border-green-400"
              )}
            >
              Alert settings
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markAllRead();
                  flash("All alerts marked as read.");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-green-400 text-gray-700 px-3 py-2 rounded-lg"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        {shared && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Shared database — alert read/dismiss state and settings sync across admins via the{" "}
            <code className="text-[10px] bg-white/80 px-1 rounded">admin-alerts</code> catalog key.
            Derived notifications still recompute from listings, users, bookings, and promotions.
          </p>
        )}

        <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Live wiring
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Read-only snapshot of alert sources. Host payments link to{" "}
                <Link href="/admin/advertisements" className="text-green-700 font-medium hover:underline">
                  Advertisements
                </Link>
                ; fraud rows link to{" "}
                <Link href="/admin/financial?tab=transactions" className="text-green-700 font-medium hover:underline">
                  Financial → Transactions
                </Link>
                ; flags link to{" "}
                <Link href="/admin/listings?tab=queue" className="text-green-700 font-medium hover:underline">
                  Listings
                </Link>{" "}
                and{" "}
                <Link href="/admin/trust?tab=reviews" className="text-green-700 font-medium hover:underline">
                  Reviews & Trust
                </Link>
                .
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-green-100 text-green-800">
              {shared ? "Shared database" : "Local storage"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Dismissed</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{dismissedCount}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Fraud threshold</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {ADMIN_ALERT_CURRENCY} {settings.highValueThresholdAed.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Signup window</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {settings.newHostSignupDays} days
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Categories · system</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {enabledCategoryCount}/5 on · {systemIssueCount} issue
                {systemIssueCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        {activeTab !== "settings" && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Sections
              </p>
              <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const unread =
                    section.id === "all"
                      ? unreadCount
                      : unreadByCategory[section.id as AdminAlertCategory];
                  const selected = activeTab === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setTab(section.id)}
                      className={cn(
                        "text-start rounded-2xl border bg-white p-4 shadow-sm transition-all shrink-0 flex-1 min-w-[8.5rem]",
                        section.accent,
                        selected && "ring-2 ring-green-600 border-green-500 shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center",
                            section.iconBg
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        {unread > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {unread} unread
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Clear
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-3">{section.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              {SECTION_WIRING[activeTab as Exclude<TabId, "settings">]}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notifications…"
                  className="w-full border border-gray-200 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Unread only
              </label>
            </div>

            {activeSection && (
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {activeSection.label}
                  <span className="text-gray-400 font-normal ms-2">
                    {filteredAlerts.length} shown
                  </span>
                </h3>
              </div>
            )}

            {activeTab === "system_health" && (
              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                Payment gateway, email, and SMS status are managed in Alert settings.
              </p>
            )}

            {activeTab === "host_payment" && (
              <p className="text-xs text-violet-800 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                When a host pays for Trending or Featured, a notification appears here instantly.
              </p>
            )}

            {filteredAlerts.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No notifications in this section</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try another section, clear search, or wait for new host activity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.sourceKey}
                    alert={alert}
                    onRead={() => {
                      markRead(alert.sourceKey);
                      flash("Marked as read.");
                    }}
                    onDismiss={() => {
                      dismiss(alert.sourceKey);
                      flash("Alert dismissed.");
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              Threshold, category toggles, and simulated infrastructure status. Settings persist to
              Shared DB when enabled; alert bodies still recompute from live listing, user, booking,
              and promotion data.
            </p>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-700" /> Fraud monitoring threshold
              </h3>
              <label className="block max-w-xs">
                <span className="text-xs text-gray-500 mb-1 block">
                  High-value alert threshold ({ADMIN_ALERT_CURRENCY})
                </span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={settings.highValueThresholdAed}
                  onChange={(e) =>
                    saveSettings({
                      ...settings,
                      highValueThresholdAed: Number(e.target.value) || 50000,
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block max-w-xs">
                <span className="text-xs text-gray-500 mb-1 block">
                  New host signup window (days)
                </span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={settings.newHostSignupDays}
                  onChange={(e) =>
                    saveSettings({
                      ...settings,
                      newHostSignupDays: Number(e.target.value) || 14,
                    })
                  }
                  className={inputClass}
                />
              </label>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-700" /> Alert categories
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    ["host_payment", "Host payment alerts (Promote / Featured)"],
                    ["host_signup", "New host signup alerts"],
                    ["flagged_content", "Flagged content / listing alerts"],
                    ["high_value_tx", "High-value transaction alerts"],
                    ["system_health", "System health alerts"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={settings.enabledCategories[key] ?? true}
                      onChange={(e) =>
                        saveSettings({
                          ...settings,
                          enabledCategories: {
                            ...settings.enabledCategories,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-green-700" /> System health status
              </h3>
              <p className="text-xs text-gray-500">
                Simulated service status for India launch demos — toggling degraded/down generates
                admin alerts until restored to operational.
              </p>
              {(
                [
                  { key: "paymentGateway" as const, label: "Payment gateway", icon: CreditCard },
                  { key: "emailService" as const, label: "Email service", icon: Mail },
                  { key: "smsService" as const, label: "SMS service", icon: MessageSquare },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                  </div>
                  <select
                    value={settings.systemHealth[key]}
                    onChange={(e) => {
                      setServiceStatus(key, e.target.value as "operational" | "degraded" | "down");
                      flash(`${label} set to ${e.target.value}.`);
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700"
                  >
                    <option value="operational">Operational</option>
                    <option value="degraded">Degraded</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              ))}
              <p className="text-[10px] text-gray-400">
                Last checked{" "}
                {new Date(settings.systemHealth.lastCheckedAt).toLocaleString("en-GB")}
              </p>
            </section>
          </div>
        )}
      </div>
    
  );
}
