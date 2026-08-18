"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Loader2,
  MapPin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminAnalyticsSection } from "./admin-analytics-section";
import { formatPlatformMoney } from "@/lib/admin/platform-analytics-data";
import { useAdminPlatformAnalytics } from "@/lib/admin/use-admin-platform-analytics";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { cn } from "@/lib/utils";

type TabId = "overview" | "regional" | "growth" | "hosts";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "regional", label: "Regional performance" },
  { id: "growth", label: "Growth & churn" },
  { id: "hosts", label: "Host performance" },
];

function HostTable({
  rows,
  variant,
}: {
  rows: {
    hostId: string;
    hostName: string;
    bookings: number;
    revenue: number;
    avgRating: number;
    cancellationRate: number;
    activeListings: number;
  }[];
  variant: "top" | "under";
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        No {variant === "top" ? "top-performing" : "underperforming"} hosts detected yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase">
          <tr>
            {["Host", "Bookings", "Revenue", "Rating", "Cancel %", "Listings"].map((h) => (
              <th key={h} className="pb-2 text-start font-semibold px-2 first:ps-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.hostId}>
              <td className="py-2.5 font-medium text-gray-800 text-xs px-2 first:ps-0">{row.hostName}</td>
              <td className="py-2.5 text-gray-600 text-xs px-2">{row.bookings}</td>
              <td className="py-2.5 text-green-700 font-semibold text-xs px-2">
                {formatPlatformMoney(row.revenue)}
              </td>
              <td className="py-2.5 text-amber-600 text-xs px-2">★ {row.avgRating}</td>
              <td
                className={cn(
                  "py-2.5 text-xs px-2",
                  row.cancellationRate >= 15 ? "text-red-600 font-semibold" : "text-gray-600"
                )}
              >
                {row.cancellationRate.toFixed(1)}%
              </td>
              <td className="py-2.5 text-gray-600 text-xs px-2">{row.activeListings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "overview";
  const countryParam = searchParams.get("country") ?? "";

  const { data: taxonomy } = useAdminTaxonomy();
  const taxonomyCountries = useMemo(
    () => filterActiveCountries(taxonomy.countries),
    [taxonomy.countries]
  );

  const { ready, snapshot, refresh, lastUpdatedLabel, availableCountries } =
    useAdminPlatformAnalytics(countryParam);
  const [refreshing, setRefreshing] = useState(false);

  const countryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of taxonomyCountries) names.add(c.name);
    for (const c of availableCountries) names.add(c);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [taxonomyCountries, availableCountries]);

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/admin/analytics?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setCountry = useCallback(
    (country: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (country) params.set("country", country);
      else params.delete("country");
      if (!params.get("tab")) params.set("tab", activeTab);
      router.replace(`/admin/analytics?${params.toString()}`);
    },
    [router, searchParams, activeTab]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
  }

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  const { churn, monthlyTrends, regionalByState, regionalByDistrict, topHosts, underperformingHosts } =
    snapshot;
  const maxGrowth = Math.max(...monthlyTrends.map((d) => d.newHosts + d.newListings), 1);

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">
              Analytics Dashboard (Platform-wide)
            </h2>
            <p className="text-gray-500 text-sm mt-1 flex flex-wrap items-center gap-2">
              Real-time metrics synced from bookings, listings, hosts &amp; reviews
              <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-medium bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live · updated {lastUpdatedLabel}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="sr-only">Country</span>
              <select
                value={countryParam}
                onChange={(e) => setCountry(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[180px]"
              >
                <option value="">All countries</option>
                {countryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-green-400 text-gray-700 px-3 py-2 rounded-lg disabled:opacity-60"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        <AdminAnalyticsSection compact showViewAll={false} countryFilter={countryParam} />

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
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Growth snapshot</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "New hosts (month)", value: monthlyTrends.at(-1)?.newHosts ?? 0, icon: Users },
                  { label: "New listings (month)", value: monthlyTrends.at(-1)?.newListings ?? 0, icon: Building2 },
                  { label: "Host growth", value: `${churn.hostGrowthPct}%`, icon: TrendingUp, positive: churn.hostGrowthPct >= 0 },
                  { label: "Listing growth", value: `${churn.listingGrowthPct}%`, icon: BarChart3, positive: churn.listingGrowthPct >= 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-100 p-3 bg-gray-50/50">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1">
                      {item.value}
                      {"positive" in item &&
                        (item.positive ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                        ))}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Churn at a glance</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-800">{churn.inactiveHosts}</p>
                  <p className="text-[10px] text-amber-700 mt-1">Inactive 90d+</p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                  <p className="text-2xl font-bold text-red-800">{churn.churnedHosts}</p>
                  <p className="text-[10px] text-red-700 mt-1">Churned / left</p>
                </div>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{churn.churnRatePct}%</p>
                  <p className="text-[10px] text-gray-600 mt-1">Churn rate</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                Inactive = no bookings in 90 days. Churned = suspended/banned or no activity in 180+ days.
              </p>
            </section>
          </div>
        )}

        {activeTab === "regional" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-blue-600" />
                By state / emirate
                {countryParam ? (
                  <span className="text-xs font-normal text-gray-500">({countryParam})</span>
                ) : null}
              </h3>
              {regionalByState.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No regional data for this country yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {regionalByState.map((row, i) => (
                    <article key={row.state} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          #{i + 1} {row.state}
                        </span>
                        <span className="text-xs text-green-700 font-semibold">
                          {formatPlatformMoney(row.revenue)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {row.bookings} bookings · {row.listings} active listings · {row.sharePct}% of
                        revenue
                      </p>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${row.sharePct}%` }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-green-600" />
                Top districts
              </h3>
              {regionalByDistrict.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No district data for this country yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {regionalByDistrict.map((row, i) => (
                    <article
                      key={`${row.state}-${row.district}`}
                      className="border border-gray-100 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          #{i + 1} {row.district}
                        </span>
                        <span className="text-xs text-gray-500">{row.state}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {row.bookings} bookings · {formatPlatformMoney(row.revenue)} · {row.listings}{" "}
                        listings
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "growth" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-600" />
                6-month growth trends
              </h3>
              <div className="flex items-end gap-3 h-44">
                {monthlyTrends.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5 h-36 justify-end">
                      <div
                        className="w-full bg-green-600 rounded-t-sm"
                        style={{
                          height: `${(d.newHosts / maxGrowth) * 80}%`,
                          minHeight: d.newHosts > 0 ? 4 : 0,
                        }}
                        title={`${d.newHosts} new hosts`}
                      />
                      <div
                        className="w-3/4 bg-blue-400 rounded-t-sm"
                        style={{
                          height: `${(d.newListings / maxGrowth) * 80}%`,
                          minHeight: d.newListings > 0 ? 4 : 0,
                        }}
                        title={`${d.newListings} new listings`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-green-600" /> New hosts
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-blue-400" /> New listings
                </span>
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Inactive &amp; churned hosts
              </h3>
              {churn.inactiveHostRows.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No inactive hosts detected.</p>
              ) : (
                <div className="space-y-2">
                  {churn.inactiveHostRows.map((row) => (
                    <article
                      key={row.hostId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{row.hostName}</p>
                        <p className="text-xs text-gray-500">{row.reason}</p>
                      </div>
                      {row.lastActivityAt && (
                        <p className="text-[10px] text-gray-400 shrink-0">
                          Last activity{" "}
                          {new Date(row.lastActivityAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "hosts" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Top-performing hosts
              </h3>
              <HostTable rows={topHosts} variant="top" />
            </section>
            <section className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Underperforming hosts
              </h3>
              <HostTable rows={underperformingHosts} variant="under" />
            </section>
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
