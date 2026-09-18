"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useContentPolicyOptions } from "@/lib/admin/use-admin-content-policy";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { DEFAULT_CANCELLATION_POLICY_ID } from "@/lib/booking/policies";
import type { HouseRule } from "@/lib/listings/submission-types";
import { HOST_LISTINGS } from "@/lib/mock/dashboard-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function HostHouseRulesContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, update, ready } = useListingSubmissions({ load: true });
  const submissions = filterHostListings(all, hostId ?? "", hostName);

  const listingOptions = useMemo(() => {
    if (submissions.length > 0) {
      return submissions.map((l) => ({ id: l.id, title: l.title }));
    }
    if (!isSharedDbEnabled()) {
      return HOST_LISTINGS.map((l) => ({ id: l.id, title: l.title }));
    }
    return [];
  }, [submissions]);

  const initialListingId =
    searchParams.get("listing") ?? listingOptions[0]?.id ?? "";

  const [listingId, setListingId] = useState(initialListingId);
  const [houseRules, setHouseRules] = useState<HouseRule[]>([]);
  const [cancellationPolicyId, setCancellationPolicyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const listing = useMemo(
    () => submissions.find((l) => l.id === listingId) ?? null,
    [submissions, listingId]
  );

  const { houseRuleTemplates, cancellationPolicies, defaultHouseRules } =
    useContentPolicyOptions(listing?.parentCategory);

  useEffect(() => {
    const fromUrl = searchParams.get("listing");
    if (fromUrl && listingOptions.some((l) => l.id === fromUrl)) {
      setListingId((prev) => (prev === fromUrl ? prev : fromUrl));
      return;
    }
    if (!listingOptions.some((l) => l.id === listingId) && listingOptions[0]) {
      const next = listingOptions[0].id;
      setListingId((prev) => (prev === next ? prev : next));
    }
  }, [listingId, listingOptions, searchParams]);

  const defaultCancellationId =
    cancellationPolicies.find((p) => p.id === DEFAULT_CANCELLATION_POLICY_ID)?.id ??
    cancellationPolicies[0]?.id ??
    DEFAULT_CANCELLATION_POLICY_ID;

  useEffect(() => {
    if (!ready) return;
    if (!listing) {
      setHouseRules(defaultHouseRules);
      setCancellationPolicyId(defaultCancellationId);
      setHydrated(true);
      return;
    }
    setHouseRules(
      listing.houseRules?.length ? listing.houseRules : defaultHouseRules
    );
    setCancellationPolicyId(
      listing.cancellationPolicyId ?? defaultCancellationId
    );
    setHydrated(true);
  }, [listing, ready, defaultCancellationId, defaultHouseRules, cancellationPolicies]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2800);
  }

  function updateRule(index: number, field: keyof HouseRule, value: string) {
    setHouseRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule))
    );
  }

  function addRule() {
    setHouseRules((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeRule(index: number) {
    setHouseRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!listing) {
      setError("Select a property to save house rules.");
      return;
    }

    setSubmitting(true);
    const ok = await update(listing.id, {
      title: listing.title,
      description: listing.description,
      country: listing.country,
      state: listing.state,
      district: listing.district,
      parentCategory: listing.parentCategory,
      category: listing.category,
      subcategory: listing.subcategory,
      type: listing.type,
      city: listing.city,
      customFilters: listing.customFilters,
      advancedFilters: listing.advancedFilters,
      photoUrls: listing.photoUrls,
      photoTags: listing.photoTags,
      photoCount: listing.photoCount,
      highlightIds: listing.highlightIds,
      featureIconIds: listing.featureIconIds,
      amenities: listing.amenities,
      farmType: listing.farmType,
      farmActivities: listing.farmActivities,
      livestockCrops: listing.livestockCrops,
      houseRules: houseRules.filter((r) => r.title.trim() && r.description.trim()),
      cancellationPolicyId: cancellationPolicyId || undefined,
    });
    setSubmitting(false);

    if (!ok) {
      setError("Could not save house rules. Please try again.");
      return;
    }
    flash("House rules & policies saved.");
  }

  if (!ready || !hydrated) {
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
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">
            House rules & policies
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Set check-in policies, guest rules, and cancellation for each property.
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl border p-4 sm:p-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
              Property
            </span>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {listingOptions.length === 0 ? (
                <option value="">No listings yet</option>
              ) : (
                listingOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))
              )}
            </select>
          </label>
          {listing?.parentCategory && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3">
              Policy pack: <span className="font-semibold">{listing.parentCategory}</span> — rules
              and cancellation options match this listing type.
            </p>
          )}
        </div>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">House rules & policies</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {houseRuleTemplates.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = houseRuleTemplates.find((t) => t.id === e.target.value);
                    if (!tpl) return;
                    setHouseRules((prev) => {
                      const exists = prev.some((r) => r.title === tpl.title);
                      if (exists) return prev;
                      return [...prev, { title: tpl.title, description: tpl.description }];
                    });
                    e.target.value = "";
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
                >
                  <option value="">Add from template…</option>
                  {houseRuleTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={addRule}
                className="inline-flex items-center gap-1 text-xs font-semibold border border-gray-200 hover:border-green-400 px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Add rule
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Cancellation policy</span>
            <select
              value={cancellationPolicyId}
              onChange={(e) => setCancellationPolicyId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {cancellationPolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.label} — {policy.shortDescription}
                </option>
              ))}
            </select>
            {cancellationPolicies.find((p) => p.id === cancellationPolicyId)?.fullText && (
              <p className="text-xs text-gray-500 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                {cancellationPolicies.find((p) => p.id === cancellationPolicyId)?.fullText}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Options are limited by platform max cancellation strictness.
            </p>
          </label>

          <div className="space-y-3">
            {houseRules.map((rule, index) => (
              <div
                key={index}
                className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Rule {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="p-1 rounded text-gray-400 hover:text-red-600"
                    aria-label="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  value={rule.title}
                  onChange={(e) => updateRule(index, "title", e.target.value)}
                  placeholder="e.g. Check-in"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <textarea
                  value={rule.description}
                  onChange={(e) => updateRule(index, "description", e.target.value)}
                  rows={2}
                  placeholder="Policy details guests should know"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ))}
            {houseRules.length === 0 && (
              <p className="text-sm text-gray-400">
                No rules yet. Add from a template or create a custom rule.
              </p>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting || !listing}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            {submitting ? "Saving…" : "Save house rules"}
          </button>
        </div>
      </form>
    </HostDashboardShell>
  );
}
