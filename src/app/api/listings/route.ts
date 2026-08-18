import { NextResponse } from "next/server";
import {
  addRoomToListingPayload,
  createListing,
  deleteListing,
  deleteRoomFromListingPayload,
  listListings,
  seedListingsIfEmpty,
  setListingStatus,
  updateListingFields,
  updateListingPayload,
  updateRoomPriceOnListingPayload,
} from "@/lib/server/listings-repo";
import type {
  AddListingRoomInput,
  SubmitListingInput,
  UpdateListingInput,
} from "@/lib/listings/submission-types";
import type { AdminListingPatch } from "@/lib/listings/submission-data";
import { getSeedListings } from "@/lib/listings/listing-seeds";
import { setListingFeaturedInDb } from "@/lib/listings/promotions-repo";

export const dynamic = "force-dynamic";

async function ensureSeeded() {
  await seedListingsIfEmpty(getSeedListings());
}

export async function GET() {
  try {
    await ensureSeeded();
    const listings = await listListings();
    return NextResponse.json({ listings, shared: true });
  } catch (error) {
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
      const input = body.input as UpdateListingInput;
      const listing = await updateListingFields(id, input);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "status") {
      const id = String(body.id || "");
      const status = body.status;
      const listing = await setListingStatus(id, status, body.extra);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "adminPatch") {
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
      const id = String(body.id || "");
      const ok = await deleteListing(id);
      return NextResponse.json({ ok });
    }

    if (action === "addRoom") {
      const listingId = String(body.listingId || "");
      const input = body.input as AddListingRoomInput;
      const result = await addRoomToListingPayload(listingId, input);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result);
    }

    if (action === "deleteRoom") {
      const listingId = String(body.listingId || "");
      const roomId = String(body.roomId || "");
      const listing = await deleteRoomFromListingPayload(listingId, roomId);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    if (action === "updateRoomPrice") {
      const listingId = String(body.listingId || "");
      const roomId = String(body.roomId || "");
      const price = Number(body.price);
      const listing = await updateRoomPriceOnListingPayload(listingId, roomId, price);
      if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ listing });
    }

    const input = body as SubmitListingInput;
    if (!input?.title || !input?.hostId) {
      return NextResponse.json({ error: "Invalid listing" }, { status: 400 });
    }
    const listing = await createListing(input);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
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
