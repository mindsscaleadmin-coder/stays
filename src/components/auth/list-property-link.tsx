"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, CalendarDays, Home, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { canManageListings } from "@/lib/auth/roles";
import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { canAddDirectoryListing } from "@/lib/host/directory-space";
import { HOST_PROFILES_SYNC_EVENT, loadHostPublicProfile } from "@/lib/host/host-profile-data";
import { useEventsSubscriptionSettings } from "@/lib/host/use-events-subscription-settings";
import {
  resolveHostId,
  useHostSubmissions,
} from "@/lib/listings/use-listing-submissions";
import {
  buildHostAuthPath,
  buildNewListingPath,
  LIST_PROPERTY_CATEGORY_THEMES,
  requiresListPropertySubscription,
  resolveListPropertyCategories,
  type ListPropertyCategoryKey,
  type ListPropertyCategoryOption,
} from "@/lib/host/list-property";
import { ListPropertySubscriptionModal } from "@/components/auth/list-property-subscription-modal";
import { ModalPortal } from "@/components/ui/modal-portal";
import { cn } from "@/lib/utils";

function categoryIcon(key: ListPropertyCategoryKey) {
  switch (key) {
    case "stays":
      return Home;
    case "experiences":
      return Sparkles;
    case "events":
      return CalendarDays;
    case "dining":
      return UtensilsCrossed;
  }
}

const CATEGORY_SECTIONS = [
  {
    id: "bookable",
    title: "Bookable",
    description: "Guests book and pay online — you set rates and availability.",
    accentClass: "text-green-800",
    borderClass: "border-green-200",
    bgClass: "bg-green-50/60",
  },
  {
    id: "directory",
    title: "Directory",
    description: "Appear in our public directory — guests enquire directly.",
    accentClass: "text-amber-900",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50/50",
  },
] as const;

function CategoryCard({
  category,
  disabled,
  onSelect,
}: {
  category: ListPropertyCategoryOption;
  disabled?: boolean;
  onSelect: (category: ListPropertyCategoryOption) => void;
}) {
  const theme = LIST_PROPERTY_CATEGORY_THEMES[category.key];
  const isDirectory = requiresListPropertySubscription(category.key);
  const Icon = categoryIcon(category.key);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(category)}
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-start shadow-sm transition-all hover:border-green-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/20 disabled:cursor-wait disabled:opacity-60"
    >
      <div className="relative h-28 shrink-0 overflow-hidden bg-gray-100 sm:h-32">
        <Image
          src={theme.img}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 200px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <span
          className={cn(
            "absolute top-2.5 start-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
            theme.badgeClass
          )}
        >
          {theme.badge}
        </span>
        <span
          className={cn(
            "absolute bottom-2.5 start-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 shadow-sm backdrop-blur-sm",
            isDirectory ? "text-amber-700" : "text-green-700"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="font-display text-sm font-semibold text-gray-900 leading-tight sm:text-base">
          {category.label}
        </p>
        <p className="mt-1 text-[11px] text-gray-500 leading-relaxed line-clamp-2 sm:text-xs">
          {theme.tagline}
        </p>
        <p
          className={cn(
            "mt-2.5 text-[10px] font-medium leading-snug",
            isDirectory ? "text-amber-800" : "text-green-800"
          )}
        >
          {isDirectory ? "Yearly plan · enquiries only" : "Your rates · online booking"}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-green-800 group-hover:text-green-950">
          Continue
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

function ListPropertyCategoryModal({
  open,
  categories,
  authLoading,
  onClose,
  onSelect,
}: {
  open: boolean;
  categories: ListPropertyCategoryOption[];
  authLoading?: boolean;
  onClose: () => void;
  onSelect: (category: ListPropertyCategoryOption) => void;
}) {
  const bookableCategories = categories.filter(
    (category) => !requiresListPropertySubscription(category.key)
  );
  const directoryCategories = categories.filter((category) =>
    requiresListPropertySubscription(category.key)
  );
  const sectionGroups = [
    { section: CATEGORY_SECTIONS[0], items: bookableCategories },
    { section: CATEGORY_SECTIONS[1], items: directoryCategories },
  ].filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-950/60 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-property-category-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-t-2xl sm:rounded-2xl bg-white shadow-[0_28px_60px_-24px_rgba(27,67,50,0.35)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-amber-50/40 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-green-800">
                Start hosting
              </p>
              <h2
                id="list-property-category-title"
                className="font-display text-xl sm:text-2xl font-semibold text-gray-900 leading-tight mt-1"
              >
                What would you like to list?
              </h2>
              <p className="text-sm text-gray-600 mt-2 max-w-lg">
                Each category has its own listing flow — bookable stays and experiences, or
                directory listings for events and dining.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-gray-400 border border-transparent hover:border-gray-200 hover:bg-white hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 space-y-5">
          {sectionGroups.length === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {sectionGroups[0].items.map((category) => (
                <CategoryCard
                  key={category.key}
                  category={category}
                  disabled={authLoading}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : (
            sectionGroups.map(({ section, items }) => (
              <section
                key={section.id}
                className={cn(
                  "rounded-2xl border p-3.5 sm:p-4 space-y-3",
                  section.borderClass,
                  section.bgClass
                )}
              >
                <div>
                  <h3
                    className={cn(
                      "text-xs font-bold uppercase tracking-[0.12em]",
                      section.accentClass
                    )}
                  >
                    {section.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {items.map((category) => (
                    <CategoryCard
                      key={category.key}
                      category={category}
                      disabled={authLoading}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-7">
          <p className="text-xs text-gray-500 text-center sm:text-start">
            {authLoading
              ? "Checking your account…"
              : "We'll sign you in or help you create a host account before you continue."}
          </p>
        </footer>
      </div>
    </div>
    </ModalPortal>
  );
}

export function ListPropertyLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const hostId = resolveHostId(user);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ListPropertyCategoryOption | null>(
    null
  );
  const [pendingCategory, setPendingCategory] = useState<ListPropertyCategoryOption | null>(
    null
  );

  const listingFlowActive =
    categoryOpen || subscriptionOpen || Boolean(pendingCategory);
  const submissions = useHostSubmissions(hostId, user?.email ?? undefined, {
    load: listingFlowActive,
  });
  const {
    freeDuringLaunch,
    eventsPlans,
    diningPlans,
    comboOffer,
  } = useEventsSubscriptionSettings({ enabled: listingFlowActive });
  const categories = useMemo(
    () => resolveListPropertyCategories(taxonomy.parents),
    [taxonomy.parents]
  );

  const proceedToListing = useCallback(
    (category: ListPropertyCategoryOption, subscriptionPlan?: string) => {
      const needsSubscription = requiresListPropertySubscription(category.key);
      router.push(
        buildNewListingPath(category.parentName, {
          showSubscription: needsSubscription && !subscriptionPlan,
          subscriptionPlan,
        })
      );
    },
    [router]
  );

  const processCategorySelect = useCallback(
    (category: ListPropertyCategoryOption) => {
      setSelectedCategory(category);

      const needsSubscription = requiresListPropertySubscription(category.key);
      const listingPath = buildNewListingPath(category.parentName, {
        showSubscription: needsSubscription,
      });

      if (!user) {
        router.push(buildHostAuthPath("login", listingPath));
        return;
      }

      if (!canManageListings(user.roles)) {
        router.push(buildHostAuthPath("signup", listingPath));
        return;
      }

      if (needsSubscription && !freeDuringLaunch) {
        const vertical = category.key === "dining" ? ("dining" as const) : ("events" as const);
        const hostProfile = hostId
          ? loadHostPublicProfile(hostId, user?.email ?? "")
          : null;
        const currentCount = submissions.filter((listing) => {
          const input = {
            parentCategory: listing.parentCategory,
            type: listing.type,
            category: listing.category,
          };
          return vertical === "dining" ? isDiningListing(input) : isEventListing(input);
        }).length;
        const check = canAddDirectoryListing({
          vertical,
          currentCount,
          profile: hostProfile,
          settings: {
            freeDuringLaunch,
            eventsPlans,
            diningPlans,
            comboOffer: comboOffer ?? undefined,
            yearlyFeeAed: 0,
          },
          freeDuringLaunch,
        });
        if (!check.allowed) {
          window.alert(check.message ?? "Directory listing limit reached.");
          return;
        }
      }

      if (needsSubscription) {
        setSubscriptionOpen(true);
        return;
      }

      proceedToListing(category);
    },
    [proceedToListing, router, user, freeDuringLaunch, submissions, eventsPlans, diningPlans, comboOffer, hostId]
  );

  function handleCategorySelect(category: ListPropertyCategoryOption) {
    if (loading) {
      setPendingCategory(category);
      return;
    }

    setCategoryOpen(false);
    setPendingCategory(null);
    processCategorySelect(category);
  }

  useEffect(() => {
    if (loading || !pendingCategory) return;
    setCategoryOpen(false);
    const category = pendingCategory;
    setPendingCategory(null);
    processCategorySelect(category);
  }, [loading, pendingCategory, processCategorySelect]);

  async function handleSubscriptionContinue(planId: string) {
    if (!selectedCategory) return;
    setSubscriptionOpen(false);
    if (hostId && planId) {
      try {
        await fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredDirectoryPlanId: planId }),
        });
        window.dispatchEvent(new Event(HOST_PROFILES_SYNC_EVENT));
      } catch {
        // Continue to listing even if profile save fails offline
      }
    }
    proceedToListing(selectedCategory, planId);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setCategoryOpen(true)}
        className={cn(className)}
        aria-haspopup="dialog"
      >
        {children}
      </button>

      <ListPropertyCategoryModal
        open={categoryOpen}
        categories={categories}
        authLoading={loading || Boolean(pendingCategory)}
        onClose={() => {
          setPendingCategory(null);
          setCategoryOpen(false);
        }}
        onSelect={handleCategorySelect}
      />

      <ListPropertySubscriptionModal
        open={subscriptionOpen}
        category={selectedCategory}
        onClose={() => setSubscriptionOpen(false)}
        onContinue={handleSubscriptionContinue}
      />
    </>
  );
}
