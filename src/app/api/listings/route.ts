import { NextResponse } from "next/server";
import {
  addRoomToListingPayload,
  createListing,
  deleteListing,
  deleteRoomFromListingPayload,
  listListings,
  listListingsByHost,
  relabelListingsInDb,
  searchListingsPage,
  seedListingsIfEmpty,
  setListingStatus,
  updateListingFields,
  updateListingPayload,
  updateRoomPriceOnListingPayload,
} from "@/lib/server/listings-repo";
import type {
  AddListingRoomInput,
  ListingReviewStatus,
  SubmitListingInput,
  UpdateListingInput,
} from "@/lib/listings/submission-types";
import type { AdminListingPatch } from "@/lib/listings/submission-data";
import type { ListingRelabelChanges } from "@/lib/listings/relabel-listings";
import {
  listingSearchHasFilters,
  type ListingSearchFilters,
} from "@/lib/listings/match-listing";
import { getSeedListings } from "@/lib/listings/listing-seeds";
import { attachPricingToListings } from "@/lib/server/listing-pricing-repo";
import { attachPublicListingMeta } from "@/lib/listings/attach-public-listing-meta";
import { listingVisibleOnPublicCatalog } from "@/lib/listings/public-listings-server";
import { listDiningSubscribedHostIds, listEventSubscribedHostIds } from "@/lib/server/host-profile-repo";
import { setListingFeaturedInDb } from "@/lib/listings/promotions-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { hostDataErrorResponse, requireListingHostOrAdmin } from "@/lib/auth/listing-access";
import { actingHostId, requireActor, requireHost, requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import { parseListingPagination } from "@/lib/listings/listings-pagination";
import { checkSearchRateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function ensureSeeded() {
  await seedListingsIfEmpty(getSeedListings());
}

const LISTING_STATUSES = new Set<ListingReviewStatus>([
  "pending",
  "approved",
  "rejected",
  "unpublished",
]);

function parseListingSearchParams(request: Request): ListingSearchFilters {
  const url = new URL(request.url);
  const pick = (key: string) => url.searchParams.get(key)?.trim() || undefined;
  const statusRaw = pick("status");
  const status =
    statusRaw && LISTING_STATUSES.has(statusRaw as ListingReviewStatus)
      ? (statusRaw as ListingReviewStatus)
      : undefined;
  return {
    status,
    country: pick("country"),
    state: pick("state"),
    district: pick("district"),
    city: pick("city"),
    parentCategory: pick("parent") || pick("parentCategory"),
    category: pick("category"),
    subcategory: pick("subcategory"),
    q: pick("q"),
  };
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await ensureSeeded();
    const filters = parseListingSearchParams(request);
    const publicCatalog = filters.status === "approved";
    const url = new URL(request.url);
    const pagination = parseListingPagination({
      page: url.searchParams.get("page"),
      perPage: url.searchParams.get("perPage") ?? url.searchParams.get("limit"),
    });
    const adminLoadAll = !publicCatalog && url.searchParams.get("all") === "1";

    if ((publicCatalog || listingSearchHasFilters(filters)) && !adminLoadAll) {
      const limited = await checkSearchRateLimit(request);
      if (!limited.success) {
        return tooManyRequestsResponse(limited.remaining, requestId);
      }
    }

    if (!publicCatalog && !isDemoApiMode()) {
      const actor = await requireActor();
      if (!canAccessAdmin(actor.roles)) {
        const hostId = actingHostId(actor);
        const scoped = await attachPublicListingMeta(
          await attachPricingToListings(
            (await listListingsByHost(hostId)).filter((listing) =>
              !filters.status || listing.status === filters.status
            )
          )
        );
        return NextResponse.json(
          {
            listings: scoped,
            total: scoped.length,
            page: 1,
            pageSize: scoped.length,
            shared: true,
          },
          { headers: { "Cache-Control": "private, no-store" } }
        );
      }
    }

    const pageResult =
      publicCatalog || listingSearchHasFilters(filters)
        ? await searchListingsPage(filters, {
            page: pagination.page,
            pageSize: pagination.pageSize,
            unlimited: adminLoadAll,
          })
        : {
            listings: await listListings(),
            total: 0,
            page: 1,
            pageSize: pagination.pageSize,
          };

    let listings = await attachPublicListingMeta(
      await attachPricingToListings(pageResult.listings)
    );
    let total = pageResult.total > 0 ? pageResult.total : listings.length;
    if (publicCatalog) {
      const subscribedEvents = new Set(await listEventSubscribedHostIds());
      const subscribedDining = new Set(await listDiningSubscribedHostIds());
      const visible = listings.filter((listing) =>
        listingVisibleOnPublicCatalog(listing, subscribedEvents, subscribedDining)
      );
      total = Math.max(0, total - (listings.length - visible.length));
      listings = visible;
    }

    const publicApproved =
      filters.status === "approved" &&
      !filters.country &&
      !filters.state &&
      !filters.district &&
      !filters.parentCategory &&
      !filters.category &&
      !filters.subcategory &&
      !filters.q;

    return NextResponse.json(
      {
        listings,
        total,
        page: pageResult.page,
        pageSize: pageResult.pageSize,
        shared: true,
      },
      {
        headers: publicApproved
          ? { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" }
          : { "Cache-Control": "private, no-store" },
      }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error);
    }
    console.error("List listings error:", error);
    return NextResponse.json({ error: "Failed to load listings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === "update") {
      const id = String(body.id || "");
      await requireListingHostOrAdmin(id);
      const input = body.input as UpdateListingInput;
      const listing = await updateListingFields(id, input);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "status") {
      const id = String(body.id || "");
      const status = body.status as ListingReviewStatus;
      if (!LISTING_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      // Hosts may only re-submit for review (pending). Approve / reject / unpublish
      // are admin-only — new properties must go through the moderation queue.
      if (status === "pending") {
        await requireListingHostOrAdmin(id);
      } else {
        await requirePlatformStaff("manage_listings");
      }
      const listing = await setListingStatus(id, status, body.extra);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "adminPatch") {
      await requirePlatformStaff("manage_listings");
      const id = String(body.id || "");
      const patch = body.patch as AdminListingPatch;
      const listing = await updateListingPayload(id, (prev) => ({
        ...prev,
        ...patch,
        id: prev.id,
        hostId: prev.hostId,
        hostName: prev.hostName,
        statusUpdatedAt: new Date().toISOString(),
      }));
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (typeof patch.featured === "boolean") {
        await setListingFeaturedInDb({
          listingId: id,
          hostId: listing.hostId,
          featured: patch.featured,
          title: listing.title,
        });
      }
      return NextResponse.json({ listing });
    }

    if (action === "delete") {
      await requirePlatformStaff("manage_listings");
      const id = String(body.id || "");
      const result = await deleteListing(id);
      if (!result.ok) {
        if (result.reason === "not_found") {
          return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }
        return NextResponse.json(
          {
            error:
              "Cannot delete listing while it has reviews, enquiries, or other linked records. Archive or resolve them first.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "addRoom") {
      const listingId = String(body.listingId || "");
      await requireListingHostOrAdmin(listingId);
      const input = body.input as AddListingRoomInput;
      const result = await addRoomToListingPayload(listingId, input);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result);
    }

    if (action === "deleteRoom") {
      const listingId = String(body.listingId || "");
      await requireListingHostOrAdmin(listingId);
      const roomId = String(body.roomId || "");
      const listing = await deleteRoomFromListingPayload(listingId, roomId);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "updateRoomPrice") {
      const listingId = String(body.listingId || "");
      await requireListingHostOrAdmin(listingId);
      const roomId = String(body.roomId || "");
      const price = Number(body.price);
      const listing = await updateRoomPriceOnListingPayload(listingId, roomId, price);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "relabel") {
      await requirePlatformStaff("manage_listings");
      const changes = body.changes as ListingRelabelChanges | undefined;
      if (!changes || typeof changes !== "object") {
        return NextResponse.json({ error: "Invalid relabel payload" }, { status: 400 });
      }
      const result = await relabelListingsInDb(changes);
      return NextResponse.json(result);
    }

    const actor = await requireHost();
    const input = body as SubmitListingInput;
    if (!input?.title) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    if (!isDemoApiMode()) {
      input.hostId = actingHostId(actor);
      input.hostName = input.hostName || actor.email || "Host";
    } else if (!input.hostId) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    const listing = await createListing(input);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, getRequestId(request));
    }
    console.error("Listing write error:", error);
    const message = error instanceof Error ? error.message : "Failed to save listing";
    const isDb =
      message.includes("postgresql://") ||
      message.includes("postgres://") ||
      message.includes("datasource") ||
      message.includes("Can't reach database") ||
      message.includes("P1001") ||
      message.includes("P1000") ||
      message.includes("ECONNREFUSED") ||
      message.includes("PrismaClientInitializationError");
    return NextResponse.json(
      {
        error: isDb
          ? "Database is not connected. Run npm run dev (it starts local Postgres) or set NEXT_PUBLIC_USE_SHARED_DB=0 for local-only saves."
          : message || "Failed to save listing",
      },
      { status: 500 }
    );
  }
}
