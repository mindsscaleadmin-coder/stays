"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import dynamic from "next/dynamic";

const HostNewListingContent = dynamic(
  () =>
    import("./host-new-listing-content").then((mod) => mod.HostNewListingContent),
  { ssr: false }
);

export function HostListingFormUrlSync({ listingId }: { listingId?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const onNavigate = useCallback(
    (href: string) => {
      router.replace(href);
    },
    [router]
  );

  return (
    <HostNewListingContent
      listingId={listingId}
      initialParentName={searchParams.get("parent")?.trim() ?? ""}
      showSubscriptionParam={searchParams.get("showSubscription") === "1"}
      subscriptionPlan={searchParams.get("subscriptionPlan")?.trim() ?? ""}
      showSavedMessage={searchParams.get("saved") === "1"}
      onNavigate={onNavigate}
    />
  );
}
