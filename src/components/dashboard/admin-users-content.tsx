"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminStaffAccessPanel } from "./admin-staff-access-panel";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { listingsForHost } from "@/lib/admin/host-helpers";
import type { AdminUserRecord, UserAccountStatus } from "@/lib/admin/user-types";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-blue-500 text-white",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  host: "bg-blue-100 text-blue-700",
  guest: "bg-gray-100 text-gray-600",
};

type ActionFilter = "" | "verify" | "suspend" | "reinstate" | "view_only";
type QuickFilter = "all" | "pending" | "suspended" | "guests";

function userInitials(name: string): string {
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

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "amber" | "green" | "orange" | "purple" | "blue";
}) {
  const tones = {
    default: "bg-white border-gray-200",
    amber: "bg-amber-50/80 border-amber-100",
    green: "bg-green-50/80 border-green-100",
    orange: "bg-orange-50/80 border-orange-100",
    purple: "bg-purple-50/80 border-purple-100",
    blue: "bg-blue-50/80 border-blue-100",
  };
  const valueTones = {
    default: "text-gray-900",
    amber: "text-amber-700",
    green: "text-green-700",
    orange: "text-orange-700",
    purple: "text-purple-700",
    blue: "text-blue-700",
  };

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn("text-2xl font-bold font-display mt-1", valueTones[tone])}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function matchesAction(user: AdminUserRecord, action: ActionFilter): boolean {
  if (!action) return true;
  const isAdmin = user.roles.includes("admin");
  switch (action) {
    case "verify":
      return user.status === "pending";
    case "suspend":
      return user.status !== "suspended" && !isAdmin;
    case "reinstate":
      return user.status === "suspended";
    case "view_only":
      return isAdmin && user.status !== "pending";
    default:
      return true;
  }
}

function UserRowCard({
  user,
  onOpen,
  onVerify,
  onSuspend,
  onUnsuspend,
}: {
  user: AdminUserRecord;
  onOpen: () => void;
  onVerify: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
}) {
  const isAdmin = user.roles.includes("admin");
  const isHost = user.roles.includes("host");
  const primaryRole = user.roles.includes("admin")
    ? "admin"
    : isHost
      ? "host"
      : "guest";
  const detailHref = isHost
    ? `/admin/hosts/${encodeURIComponent(user.id)}`
    : `/admin/users/${encodeURIComponent(user.id)}`;

  const avatarTone =
    primaryRole === "admin"
      ? "from-purple-600 to-purple-700"
      : primaryRole === "host"
        ? "from-blue-600 to-blue-700"
        : "from-gray-600 to-gray-700";

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all p-4 sm:p-5 cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "w-11 h-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm",
              avatarTone
            )}
          >
            {userInitials(user.name)}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 truncate">{user.name}</h3>
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full capitalize",
                  STATUS_STYLES[user.status]
                )}
              >
                {statusLabel(user.status)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{user.email}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                Joined {formatJoined(user.joinedAt)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full capitalize",
                    ROLE_STYLES[r] ?? "bg-gray-100 text-gray-600"
                  )}
                >
                  {r}
                </span>
              ))}
              {isAdmin && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Protected
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          {user.status === "pending" && (
            <button
              type="button"
              onClick={onVerify}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Verify
            </button>
          )}
          {user.status === "suspended" ? (
            <button
              type="button"
              onClick={onUnsuspend}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-2 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Reinstate
            </button>
          ) : (
            !isAdmin && (
              <button
                type="button"
                onClick={onSuspend}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Ban className="w-3.5 h-3.5" /> Suspend
              </button>
            )
          )}
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2.5 rounded-xl transition-colors"
          >
            View
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = useAdminStaffAccess();
  const canManageUsers = can("manage_users");
  const canManageStaff = can("manage_staff");
  const tabParam = searchParams.get("tab");
  const tab: "users" | "staff" =
    tabParam === "staff" && canManageStaff
      ? "staff"
      : canManageUsers
        ? "users"
        : canManageStaff
          ? "staff"
          : "users";

  const { users, suspend, verify, unsuspend } = useAdminUsers();
  const { all: listings } = useListingSubmissions();
  const { data: taxonomy } = useAdminTaxonomy();
  const [nameQuery, setNameQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<UserAccountStatus | "">("");
  const [action, setAction] = useState<ActionFilter>("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [message, setMessage] = useState("");

  function setTab(next: "users" | "staff") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "users") params.delete("tab");
    else params.set("tab", "staff");
    const qs = params.toString();
    router.replace(qs ? `/admin/users?${qs}` : "/admin/users");
  }

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

  const userStats = useMemo(() => {
    const pending = users.filter((u) => u.status === "pending").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    const hosts = users.filter((u) => u.roles.includes("host")).length;
    const guests = users.filter((u) => u.roles.includes("guest") && !u.roles.includes("host")).length;
    return {
      total: users.length,
      verified: users.filter((u) => u.status === "verified").length,
      pending,
      suspended,
      hosts,
      guests,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();

    return users.filter((u) => {
      if (q) {
        const haystack = `${u.name} ${u.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (role && !u.roles.includes(role)) return false;
      if (status && u.status !== status) return false;
      if (!matchesAction(u, action)) return false;

      const joined = toDateKey(u.joinedAt);
      if (dateFrom && joined < dateFrom) return false;
      if (dateTo && joined > dateTo) return false;

      if (country || state) {
        const userListings = listingsForHost(listings, u);
        const matchesLocation = userListings.some((listing) => {
          if (country && listing.country !== country) return false;
          if (state && listing.state !== state) return false;
          return true;
        });
        if (!matchesLocation) return false;
      }

      return true;
    });
  }, [users, nameQuery, role, status, action, dateFrom, dateTo, country, state, listings]);

  const activeFilterCount = [
    nameQuery,
    role,
    status,
    action,
    country,
    state,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  function clearFilters() {
    setNameQuery("");
    setRole("");
    setStatus("");
    setAction("");
    setCountry("");
    setState("");
    setDateFrom("");
    setDateTo("");
  }

  function applyQuickFilter(preset: QuickFilter) {
    clearFilters();
    if (preset === "pending") setStatus("pending");
    if (preset === "suspended") setStatus("suspended");
    if (preset === "guests") setRole("guest");
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function openUser(user: AdminUserRecord) {
    if (user.roles.includes("host")) {
      router.push(`/admin/hosts/${encodeURIComponent(user.id)}`);
      return;
    }
    router.push(`/admin/users/${encodeURIComponent(user.id)}`);
  }

  function handleSuspend(user: AdminUserRecord) {
    if (user.roles.includes("admin")) {
      flash("Admin accounts cannot be suspended.");
      return;
    }
    if (!confirm(`Suspend ${user.name}? They will lose platform access.`)) return;
    suspend(user.id);
    flash(`${user.name} has been suspended.`);
  }

  function handleVerify(user: AdminUserRecord) {
    verify(user.id);
    flash(`${user.name} has been verified.`);
  }

  function handleUnsuspend(user: AdminUserRecord) {
    unsuspend(user.id);
    flash(`${user.name} has been reinstated.`);
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Users & Access</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage marketplace users and staff allow / not-allow access in one place.
          </p>
        </div>

        {(canManageUsers || canManageStaff) && (
          <nav className="flex flex-wrap gap-1.5">
            {canManageUsers && (
              <button
                type="button"
                onClick={() => setTab("users")}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors",
                  tab === "users"
                    ? "bg-green-700 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                )}
              >
                <Users className="w-4 h-4" strokeWidth={1.75} />
                Marketplace users
              </button>
            )}
            {canManageStaff && (
              <button
                type="button"
                onClick={() => setTab("staff")}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors",
                  tab === "staff"
                    ? "bg-green-700 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                )}
              >
                <Shield className="w-4 h-4" strokeWidth={1.75} />
                Staff allow / not allow
              </button>
            )}
          </nav>
        )}

        {tab === "staff" ? (
          <AdminStaffAccessPanel />
        ) : (
          <>
        <div>
          <h3 className="text-lg font-bold text-gray-900 font-display">Marketplace users</h3>
          <p className="text-gray-500 text-sm mt-1">
            Suspend, verify, and manage guest and host accounts.
            {userStats.pending > 0 && (
              <span className="text-amber-600 font-medium">
                {" "}
                {userStats.pending} pending verification.
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Total users" value={userStats.total} />
          <StatCard label="Verified" value={userStats.verified} tone="blue" hint="Active accounts" />
          <StatCard label="Pending" value={userStats.pending} tone="amber" hint="Needs verification" />
          <StatCard label="Suspended" value={userStats.suspended} tone="orange" hint="Access revoked" />
          <StatCard label="Hosts" value={userStats.hosts} tone="blue" />
          <StatCard label="Guests" value={userStats.guests} tone="default" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All users"],
              ["pending", "Pending verification"],
              ["suspended", "Suspended"],
              ["guests", "Guests"],
            ] as const
          ).map(([key, label]) => {
            const active =
              (key === "all" && activeFilterCount === 0) ||
              (key === "pending" && status === "pending") ||
              (key === "suspended" && status === "suspended") ||
              (key === "guests" && role === "guest");
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b bg-gray-50/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Search & filters</h3>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-800">{filtered.length}</span> of{" "}
                {users.length} users
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
            <div className="p-4 space-y-4 border-b bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className={cn(inputClass, "ps-9")}
                />
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-0">
                <FilterField label="Joined from">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={inputClass}
                  />
                </FilterField>

                <FilterField label="Joined to">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={inputClass}
                  />
                </FilterField>

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

                <FilterField label="Role">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                    <option value="">All roles</option>
                    <option value="guest">Guest</option>
                    <option value="host">Host</option>
                    <option value="admin">Admin</option>
                  </select>
                </FilterField>

                <FilterField label="Status">
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

                <FilterField label="Available action">
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as ActionFilter)}
                    className={inputClass}
                  >
                    <option value="">Any action</option>
                    <option value="verify">Needs verify</option>
                    <option value="suspend">Can suspend</option>
                    <option value="reinstate">Can reinstate</option>
                    <option value="view_only">View only</option>
                  </select>
                </FilterField>
              </div>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm p-10 text-center">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No users match your filters</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Try a different name, email, country, state, role, or status filter.
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
              <UserRowCard
                key={u.id}
                user={u}
                onOpen={() => openUser(u)}
                onVerify={() => handleVerify(u)}
                onSuspend={() => handleSuspend(u)}
                onUnsuspend={() => handleUnsuspend(u)}
              />
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </AdminDashboardShell>
  );
}
