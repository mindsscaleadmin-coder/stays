"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { EVENTS_SUBSCRIPTION_CURRENCY } from "@/lib/admin/events-subscription";
import {
  billingStatusLabel,
  effectiveDirectoryExpiry,
  resolveDirectoryBillingStatus,
} from "@/lib/host/directory-billing";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";
import { formatSubscriptionExpiry } from "@/lib/host/events-subscription";
import {
  formatEventsPlanFee,
  normalizeEventsSubscription,
  resolveDirectoryPlanFee,
} from "@/lib/admin/events-subscription";
import { useEventsSubscriptionSettings } from "@/lib/host/use-events-subscription-settings";

export function HostDirectoryBillingBanner({
  hostId,
  profile,
}: {
  hostId: string;
  profile: HostPublicProfile | null | undefined;
}) {
  const { eventsPlans, diningPlans, comboOffer } = useEventsSubscriptionSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!profile?.directoryBillingEnforced) return null;

  const status = resolveDirectoryBillingStatus(profile);
  if (status === "launch_free" || status === "active") return null;

  const planId = profile.preferredDirectoryPlanId || "events-single";
  const settings = normalizeEventsSubscription({
    freeDuringLaunch: false,
    eventsPlans,
    diningPlans,
    comboOffer: comboOffer ?? undefined,
  });

  const yearlyFee = resolveDirectoryPlanFee(planId, settings);

  const tone =
    status === "expired"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-950";

  async function handlePayNow() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/hosts/${encodeURIComponent(hostId)}/directory-subscription/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        }
      );
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMessage(
        data.error ??
          "Online payment is not available yet. Contact support to complete your yearly subscription."
      );
    } catch {
      setMessage("Could not start checkout. Contact support to pay offline.");
    } finally {
      setBusy(false);
    }
  }

  const expiry = effectiveDirectoryExpiry(profile);
  const grace = profile.directoryBillingGraceEndsAt;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${tone}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 shrink-0" />
            Directory subscription · {billingStatusLabel(status)}
          </p>
          <p className="text-sm mt-1 opacity-90">
            {status === "expired"
              ? "Your directory listings are hidden until you renew your yearly plan."
              : "Your free period has ended. Subscribe to keep your events and dining listings public."}
          </p>
          <p className="text-xs mt-2 opacity-80">
            Preferred plan: <strong>{planId}</strong>
            {yearlyFee > 0 ? (
              <>
                {" "}
                · {formatEventsPlanFee(yearlyFee, EVENTS_SUBSCRIPTION_CURRENCY)}/year
              </>
            ) : null}
            {grace ? <> · Grace until {formatSubscriptionExpiry(grace)}</> : null}
            {expiry && status !== "expired" ? (
              <> · Paid until {formatSubscriptionExpiry(expiry)}</>
            ) : null}
          </p>
          {message ? <p className="text-xs mt-2 font-medium">{message}</p> : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePayNow()}
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Pay now
        </button>
      </div>
    </div>
  );
}
