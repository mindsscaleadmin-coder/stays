"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronRight,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import {
  buildHostListingStats,
  listingsForHost,
  resolveAdminHosts,
  statsForHost,
  type HostListingStats,
} from "@/lib/admin/host-helpers";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { ensureAdminHostUser } from "@/lib/admin/user-data";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import type { AdminUserRecord, UserAccountStatus } from "@/lib/admin/user-types";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { findHostVerification } from "@/lib/host/verification-data";
import type { HostVerificationRequest } from "@/lib/host/verification-types";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full min-w-0 max-w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-blue-500 text-white",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

type ListingActivityFilter = "" | "has_live" | "has_pending" | "no_listings";
type VerificationFilter = "" | "pending" | "verified" | "rejected" | "none";
type QuickFilter = "all" | "pending" | "suspended" | "banned" | "id_pending" | "live";

function hostInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block w-full min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "amber" | "green" | "orange" | "red" | "blue";
  onClick?: () => void;
}) {
  const tones = {
    default: "bg-white border-gray-200",
    amber: "bg-amber-50/80 border-amber-100",
    green: "bg-green-50/80 border-green-100",
    orange: "bg-orange-50/80 border-orange-100",
    red: "bg-red-50/80 border-red-100",
    blue: "bg-blue-50/80 border-blue-100",
  };
  const valueTones = {
    default: "text-gray-900",
    amber: "text-amber-700",
    green: "text-green-700",
    orange: "text-orange-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };

  const content = (
    <>
      <p
        className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500"
        title={label}
      >
        {label}
      </p>
      <p className={cn("mt-0.5 text-lg font-bold font-display leading-tight", valueTones[tone])}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[10px] text-gray-500" title={hint}>
          {hint}
        </p>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className={cn("min-w-0 rounded-xl border p-2.5 shadow-sm sm:p-3", tones[tone])}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-xl border p-2.5 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 sm:p-3",
        tones[tone]
      )}
    >
      {content}
    </button>
  );
}

function HostRowCard({
  host,
  stats,
  verificationRequest,
  canApprove,
  canRestrict,
  canImpersonate,
  onOpen,
  onVerify,
  onSuspend,
  onBan,
  onReinstate,
  onImpersonate,
}: {
  host: AdminUserRecord;
  stats: HostListingStats;
  verificationRequest: HostVerificationRequest | null;
  canApprove: boolean;
  canRestrict: boolean;
  canImpersonate: boolean;
  onOpen: () => void;
  onVerify: () => void;
  onSuspend: () => void;
  onBan: () => void;
  onReinstate: () => void;
  onImpersonate: () => void;
}) {
  const verifyReq = verificationRequest;
  const detailHref = `/admin/hosts/${encodeURIComponent(host.id)}`;
  const isRestricted = host.status === "suspended" || host.status === "banned";

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all p-4 sm:p-5 cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
            {hostInitials(host.name)}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 truncate">{host.name}</h3>
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full capitalize",
                  STATUS_STYLES[host.status]
                )}
              >
                {statusLabel(host.status)}
              </span>
              {verifyReq?.status === "pending" && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  ID docs pending
                </span>
              )}
              {verifyReq?.status === "verified" && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500 text-white border border-blue-500">
                  ID verified
                </span>
              )}
              {verifyReq?.status === "rejected" && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  ID rejected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{host.email}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                Joined {formatJoined(host.joinedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                {stats.total} listing{stats.total === 1 ? "" : "s"} · {stats.active} live ·{" "}
                {stats.pending} pending
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize bg-blue-100 text-blue-700">
                Host
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          {host.status === "pending" && canApprove && (
            <button
              type="button"
              onClick={onVerify}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Approve
            </button>
          )}
          {isRestricted && canRestrict ? (
            <button
              type="button"
              onClick={onReinstate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-2 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Reinstate
            </button>
          ) : !isRestricted && canRestrict ? (
            <>
              <button
                type="button"
                onClick={onSuspend}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Ban className="w-3.5 h-3.5" /> Suspend
              </button>
              <button
                type="button"
                onClick={onBan}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 border border-red-300 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
              >
                Ban
              </button>
              {canImpersonate && (
                <button
                  type="button"
                  onClick={onImpersonate}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors"
                >
                  Login as
                </button>
              )}
            </>
          ) : null}
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2.5 rounded-xl transition-colors"
          >
            {verifyReq?.status === "pending" ? "Review docs" : "View"}
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AdminHostsContent() {
  const { users, suspend, ban, verify, reinstate } = useAdminUsers();
  const { isDemo, startImpersonatingHost } = useAuth();
  const { can } = useAdminStaffAccess();
  const canApprove = can("approve_kyc");
  const canRestrict = can("suspend_hosts");
  const canImpersonate = isDemo && can("impersonate_hosts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { all: listings } = useListingSubmissions();
  const { data: taxonomy } = useAdminTaxonomy();
  const { all: verifications, pendingCount } = useHostVerification();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserAccountStatus | "">("");
  const [verification, setVerification] = useState<VerificationFilter>(() => {
    const requested = searchParams.get("verification");
    return requested === "pending" ||
      requested === "verified" ||
      requested === "rejected" ||
      requested === "none"
      ? requested
      : "";
  });
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [listingActivity, setListingActivity] = useState<ListingActivityFilter>("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [message, setMessage] = useState("");

  const hosts = useMemo(() => resolveAdminHosts(users, listings), [users, listings]);
  const listingStats = useMemo(() => buildHostListingStats(listings), [listings]);

  const countries = useMemo(() => {
    const fromTaxonomy = filterActiveCountries(taxonomy.countries).map((c) => c.name);
    const extras = listings
      .map((l) => l.country)
      .filter((name): name is string => Boolean(name) && !fromTaxonomy.includes(name));
    return [...fromTaxonomy, ...Array.from(new Set(extras)).sort()];
  }, [taxonomy.countries, listings]);

  const states = useMemo(() => {
    const countryMatch = taxonomy.countries.find((c) => c.name === country);
    const fromTaxonomy = taxonomy.states
      .filter((s) => !countryMatch || s.countryId === countryMatch.id)
      .map((s) => s.name);
    const extras = listings
      .filter((l) => !country || l.country === country)
      .map((l) => l.state)
      .filter((name): name is string => Boolean(name) && !fromTaxonomy.includes(name));
    return [...fromTaxonomy, ...Array.from(new Set(extras)).sort()];
  }, [taxonomy.states, taxonomy.countries, listings, country]);

  const parents = useMemo(() => {
    const fromTaxonomy = taxonomy.parents.map((p) => p.name);
    const extras = listings
      .map((l) => l.parentCategory)
      .filter((name): name is string => Boolean(name) && !fromTaxonomy.includes(name));
    return [...fromTaxonomy, ...Array.from(new Set(extras)).sort()];
  }, [taxonomy.parents, listings]);

  const subcategories = useMemo(() => {
    const parentMatch = taxonomy.parents.find((p) => p.name === parentCategory);
    const fromTaxonomy = taxonomy.subcategories
      .filter((sc) => !parentMatch || sc.parentId === parentMatch.id)
      .map((sc) => sc.name);
    const extras = listings
      .filter((l) => !parentCategory || l.parentCategory === parentCategory)
      .map((l) => l.subcategory)
      .filter((name): name is string => Boolean(name) && !fromTaxonomy.includes(name));
    return [...fromTaxonomy, ...Array.from(new Set(extras)).sort()];
  }, [taxonomy.subcategories, taxonomy.parents, listings, parentCategory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return hosts.filter((host) => {
      if (status && host.status !== status) return false;

      const verifyReq =
        verifications.find((row) => row.hostId === host.id) ?? findHostVerification(host);
      const verifyStatus = verifyReq?.status ?? "none";
      if (verification === "none" && verifyReq) return false;
      if (verification && verification !== "none" && verifyStatus !== verification) {
        return false;
      }

      const stats = statsForHost(listingStats, host);
      if (listingActivity === "has_live" && stats.active === 0) return false;
      if (listingActivity === "has_pending" && stats.pending === 0) return false;
      if (listingActivity === "no_listings" && stats.total > 0) return false;

      const hostListings = listingsForHost(listings, host);
      if (country || state || parentCategory || subcategory) {
        const matchesLocation = hostListings.some((listing) => {
          if (country && listing.country !== country) return false;
          if (state && listing.state !== state) return false;
          if (parentCategory && listing.parentCategory !== parentCategory) return false;
          if (subcategory && listing.subcategory !== subcategory) return false;
          return true;
        });
        if (!matchesLocation) return false;
      }

      if (!q) return true;
      return (
        host.name.toLowerCase().includes(q) ||
        host.email.toLowerCase().includes(q) ||
        host.id.toLowerCase().includes(q)
      );
    });
  }, [
    hosts,
    query,
    status,
    verification,
    country,
    state,
    parentCategory,
    subcategory,
    listingActivity,
    listings,
    listingStats,
    verifications,
  ]);

  const activeFilterCount =
    [status, verification, country, state, parentCategory, subcategory, listingActivity].filter(
      Boolean
    ).length + (query ? 1 : 0);

  const suspendedHosts = hosts.filter((h) => h.status === "suspended").length;
  const bannedHosts = hosts.filter((h) => h.status === "banned").length;
  const activeHosts = hosts.filter((h) => h.status === "verified").length;
  const pendingHosts = hosts.filter((h) => h.status === "pending").length;

  function clearFilters() {
    setQuery("");
    setStatus("");
    setVerification("");
    setCountry("");
    setState("");
    setParentCategory("");
    setSubcategory("");
    setListingActivity("");
  }

  function applyQuickFilter(preset: QuickFilter) {
    clearFilters();
    if (preset === "pending") setStatus("pending");
    if (preset === "suspended") setStatus("suspended");
    if (preset === "banned") setStatus("banned");
    if (preset === "id_pending") setVerification("pending");
    if (preset === "live") setListingActivity("has_live");
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function openHost(id: string) {
    router.push(`/admin/hosts/${encodeURIComponent(id)}`);
  }

  function handleSuspend(user: AdminUserRecord) {
    if (user.roles.includes("admin")) {
      flash("Admin accounts cannot be suspended.");
      return;
    }
    if (!confirm(`Suspend host ${user.name}? They will lose host access.`)) return;
    ensureAdminHostUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
    });
    flash(
      suspend(user.id)
        ? `${user.name} has been suspended.`
        : `Could not suspend ${user.name}. Please try again.`
    );
  }

  function handleBan(user: AdminUserRecord) {
    if (user.roles.includes("admin")) {
      flash("Admin accounts cannot be banned.");
      return;
    }
    if (!confirm(`Ban host ${user.name}? This permanently blocks host access until reinstated.`))
      return;
    ensureAdminHostUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
    });
    flash(
      ban(user.id)
        ? `${user.name} has been banned.`
        : `Could not ban ${user.name}. Please try again.`
    );
  }

  function handleVerify(user: AdminUserRecord) {
    ensureAdminHostUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
    });
    flash(
      verify(user.id)
        ? `${user.name} has been verified.`
        : `Could not verify ${user.name}. Please try again.`
    );
  }

  function handleReinstate(user: AdminUserRecord) {
    ensureAdminHostUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
    });
    flash(
      reinstate(user.id)
        ? `${user.name} has been reinstated.`
        : `Could not reinstate ${user.name}. Please try again.`
    );
  }

  function handleImpersonate(user: AdminUserRecord) {
    if (user.status === "suspended" || user.status === "banned") {
      flash("Cannot impersonate a restricted host.");
      return;
    }
    const result = startImpersonatingHost(user);
    if (result.error) {
      flash(result.error);
      return;
    }
    router.push("/host");
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Host Control Panel</h2>
          <p className="text-gray-500 text-sm mt-1">
            Approve KYC, suspend or ban hosts, edit profiles, and filter by location or listings.
            {pendingCount > 0 && (
              <span className="text-amber-600 font-medium">
                {" "}
                {pendingCount} ID verification{pendingCount === 1 ? "" : "s"} pending.
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          <StatCard label="Hosts" value={hosts.length} onClick={() => applyQuickFilter("all")} />
          <StatCard
            label="Active"
            value={activeHosts}
            tone="blue"
            hint="Verified accounts"
            onClick={() => {
              clearFilters();
              setStatus("verified");
            }}
          />
          <StatCard
            label="Pending"
            value={pendingHosts}
            tone="amber"
            hint="Needs approval"
            onClick={() => applyQuickFilter("pending")}
          />
          <StatCard
            label="ID verification"
            value={pendingCount}
            tone="amber"
            hint="Docs to review"
            onClick={() => applyQuickFilter("id_pending")}
          />
          <StatCard
            label="Suspended"
            value={suspendedHosts}
            tone="orange"
            onClick={() => applyQuickFilter("suspended")}
          />
          <StatCard
            label="Banned"
            value={bannedHosts}
            tone="red"
            onClick={() => applyQuickFilter("banned")}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All hosts"],
              ["pending", "Pending approval"],
              ["id_pending", "ID docs pending"],
              ["live", "Has live listings"],
              ["suspended", "Suspended"],
              ["banned", "Banned"],
            ] as const
          ).map(([key, label]) => {
            const active =
              (key === "all" && activeFilterCount === 0) ||
              (key === "pending" && status === "pending") ||
              (key === "suspended" && status === "suspended") ||
              (key === "banned" && status === "banned") ||
              (key === "id_pending" && verification === "pending") ||
              (key === "live" && listingActivity === "has_live");
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyQuickFilter(key)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                  active
                    ? "bg-green-700 border-green-700 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-800"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b bg-gray-50/80">
            <div className="flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="w-4 h-4 text-green-700 shrink-0" />
              <h3 className="text-sm font-semibold text-gray-900 truncate">Search & filters</h3>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-800">{filtered.length}</span> of{" "}
                {hosts.length} hosts
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-green-700 font-semibold hover:underline"
                >
                  <X className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="text-green-700 font-semibold hover:underline"
              >
                {filtersOpen ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="gadget-filter-panel p-3 sm:p-4 space-y-3 sm:space-y-4 border-b bg-white min-w-0">
              <div className="relative min-w-0">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className={cn(inputClass, "ps-9")}
                />
              </div>

              <div className="gadget-filter-grid">
                <FilterField label="Country">
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setState("");
                    }}
                    className={inputClass}
                  >
                    <option value="">All countries</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="State">
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">All states</option>
                    {states.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Parent category">
                  <select
                    value={parentCategory}
                    onChange={(e) => {
                      setParentCategory(e.target.value);
                      setSubcategory("");
                    }}
                    className={inputClass}
                  >
                    <option value="">All categories</option>
                    {parents.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Sub category">
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">All subcategories</option>
                    {subcategories.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Account status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserAccountStatus | "")}
                    className={inputClass}
                  >
                    <option value="">All statuses</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </FilterField>

                <FilterField label="ID verification">
                  <select
                    value={verification}
                    onChange={(e) => setVerification(e.target.value as VerificationFilter)}
                    className={inputClass}
                  >
                    <option value="">All ID statuses</option>
                    <option value="pending">Pending review</option>
                    <option value="verified">Documents verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="none">No request</option>
                  </select>
                </FilterField>

                <FilterField label="Listing activity">
                  <select
                    value={listingActivity}
                    onChange={(e) =>
                      setListingActivity(e.target.value as ListingActivityFilter)
                    }
                    className={inputClass}
                  >
                    <option value="">All activity</option>
                    <option value="has_live">Has live listings</option>
                    <option value="has_pending">Has pending listings</option>
                    <option value="no_listings">No listings</option>
                  </select>
                </FilterField>
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm p-10 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No hosts match your filters</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Try a different name, email, country, state, or status filter.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-green-700 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <HostRowCard
                key={u.id}
                host={u}
                stats={statsForHost(listingStats, u)}
                verificationRequest={
                  verifications.find(
                    (row) =>
                      row.hostId === u.id ||
                      row.hostEmail.toLowerCase() === u.email.toLowerCase() ||
                      row.hostName.toLowerCase() === u.name.toLowerCase()
                  ) ?? findHostVerification(u)
                }
                canApprove={canApprove}
                canRestrict={canRestrict}
                canImpersonate={canImpersonate}
                onOpen={() => openHost(u.id)}
                onVerify={() => handleVerify(u)}
                onSuspend={() => handleSuspend(u)}
                onBan={() => handleBan(u)}
                onReinstate={() => handleReinstate(u)}
                onImpersonate={() => handleImpersonate(u)}
              />
            ))}
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
