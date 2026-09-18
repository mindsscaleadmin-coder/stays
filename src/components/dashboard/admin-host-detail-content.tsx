"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Download,
  ExternalLink,
  FileText,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Tag,
  UserRound,
} from "lucide-react";
import {
  buildHostListingStats,
  findAdminHost,
  listingsForHost,
  resolveAdminHosts,
  statsForHost,
} from "@/lib/admin/host-helpers";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminStaffAccess } from "@/lib/admin/use-admin-staff-access";
import { ensureAdminHostUser, formatJoinedAt } from "@/lib/admin/user-data";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";
import { idTypeLabel } from "@/lib/host/verification-data";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { cn, downloadDataUrlFile } from "@/lib/utils";
import { AdminHostStaffPermissionsPanel } from "@/components/dashboard/admin-host-staff-permissions-panel";

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-blue-500 text-white",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

const LISTING_STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

const VERIFY_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-blue-500 text-white",
  rejected: "bg-red-100 text-red-700",
};

export function AdminHostDetailContent({ hostId }: { hostId: string }) {
  const router = useRouter();
  const { isDemo, startImpersonatingHost } = useAuth();
  const { can } = useAdminStaffAccess();
  const canApprove = can("approve_kyc");
  const canRestrict = can("suspend_hosts");
  const canEdit = can("edit_host_profiles");
  const canImpersonate = isDemo && can("impersonate_hosts");
  const { users, suspend, ban, verify, reinstate, updateProfile } = useAdminUsers();
  const { all: listings, ready } = useListingSubmissions({ load: true });
  const { all: verifications, approve, reject } = useHostVerification();
  const [message, setMessage] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNote, setEditNote] = useState("");

  const hosts = useMemo(() => resolveAdminHosts(users, listings), [users, listings]);
  const host = useMemo(() => findAdminHost(hosts, hostId), [hosts, hostId]);
  const listingStats = useMemo(() => buildHostListingStats(listings), [listings]);
  const hostListings = useMemo(
    () => (host ? listingsForHost(listings, host) : []),
    [listings, host]
  );
  const stats = host ? statsForHost(listingStats, host) : null;
  const verification = useMemo(() => {
    if (!host) return null;
    return (
      verifications.find(
        (r) =>
          r.hostId === host.id ||
          r.hostEmail.toLowerCase() === host.email.toLowerCase() ||
          r.hostName.toLowerCase() === host.name.toLowerCase()
      ) ?? null
    );
  }, [host, verifications]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function startEdit() {
    if (!host) return;
    setEditName(host.name);
    setEditEmail(host.email);
    setEditPhone(host.phone ?? "");
    setEditNote(host.adminNote ?? "");
    setEditing(true);
  }

  function handleSaveProfile() {
    if (!host) return;
    ensureAdminHostUser({
      id: host.id,
      name: host.name,
      email: host.email,
      phone: host.phone,
      country: host.country,
    });
    const saved = updateProfile(host.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      adminNote: editNote,
    });
    if (!saved) {
      flash("Could not update this host. Please try again.");
      return;
    }
    setEditing(false);
    flash("Host profile updated.");
  }

  function handleImpersonate() {
    if (!host) return;
    const result = startImpersonatingHost(host);
    if (result.error) {
      flash(result.error);
      return;
    }
    router.push("/host");
  }

  function handleApproveDocs() {
    if (!verification || !host) return;
    approve(verification.hostId, reviewNote);
    ensureAdminHostUser({
      id: host.id,
      name: host.name,
      email: host.email,
      phone: host.phone,
      country: host.country,
    });
    if (!verify(host.id)) {
      flash("Documents were approved, but the host status could not be updated.");
      return;
    }
    setReviewNote("");
    flash("ID documents approved and host marked verified.");
  }

  function handleRejectDocs() {
    if (!verification) return;
    reject(verification.hostId, reviewNote || "Documents were not accepted.");
    setReviewNote("");
    flash("Verification request rejected.");
  }

  if (ready && !host) {
    return (
              <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Host not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This host may have been removed or the link is invalid.
          </p>
          <Link href="/admin/hosts" className="text-green-700 font-semibold text-sm hover:underline">
            Back to Host Control Panel
          </Link>
        </div>
      
    );
  }

  if (!host || !stats) {
    return (
              <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
          Loading host details…
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div>
          <Link
            href="/admin/hosts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Host Control Panel
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-blue-700" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 font-display">{host.name}</h2>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                      STATUS_STYLES[host.status]
                    )}
                  >
                    {host.status}
                  </span>
                  {verification && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                        VERIFY_STATUS_STYLES[verification.status]
                      )}
                    >
                      ID {verification.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1 truncate">{host.id}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {host.status === "pending" && canApprove && (
                <button
                  type="button"
                  onClick={() => {
                    ensureAdminHostUser({
                      id: host.id,
                      name: host.name,
                      email: host.email,
                      phone: host.phone,
                      country: host.country,
                    });
                    flash(
                      verify(host.id)
                        ? `${host.name} has been approved.`
                        : `Could not approve ${host.name}.`
                    );
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  Approve signup
                </button>
              )}
              {(host.status === "suspended" || host.status === "banned") && canRestrict && (
                <button
                  type="button"
                  onClick={() => {
                    flash(
                      reinstate(host.id)
                        ? `${host.name} has been reinstated.`
                        : `Could not reinstate ${host.name}.`
                    );
                  }}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  Reinstate
                </button>
              )}
              {host.status !== "suspended" && host.status !== "banned" && canRestrict && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Suspend host ${host.name}?`)) return;
                        ensureAdminHostUser({
                          id: host.id,
                          name: host.name,
                          email: host.email,
                          phone: host.phone,
                          country: host.country,
                        });
                        flash(
                          suspend(host.id)
                            ? `${host.name} has been suspended.`
                            : `Could not suspend ${host.name}.`
                        );
                    }}
                    className="text-xs border border-orange-200 hover:bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Ban host ${host.name}?`)) return;
                        ensureAdminHostUser({
                          id: host.id,
                          name: host.name,
                          email: host.email,
                          phone: host.phone,
                          country: host.country,
                        });
                        flash(
                          ban(host.id)
                            ? `${host.name} has been banned.`
                            : `Could not ban ${host.name}.`
                        );
                    }}
                    className="text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Ban
                  </button>
                </>
              )}
              {canImpersonate && host.status !== "suspended" && host.status !== "banned" && (
                <button
                  type="button"
                  onClick={handleImpersonate}
                  className="inline-flex items-center gap-1 text-xs border border-gray-300 hover:border-green-400 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                >
                  <UserRound className="w-3.5 h-3.5" /> Login as host
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex items-center gap-1 text-xs border border-gray-300 hover:border-green-400 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit profile
                </button>
              )}
            </div>
          </div>
        </div>

        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Total listings
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Live</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Rejected
            </p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Host details</h3>
            {!editing && canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="text-xs font-semibold text-green-700 hover:underline"
              >
                Override profile
              </button>
            )}
          </div>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Name</span>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Email</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Phone</span>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Admin note</span>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Internal note for this host…"
                />
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Save overrides
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs font-medium text-gray-600 px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                {host.email}
              </div>
              {host.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  {host.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <Shield className="w-4 h-4 text-gray-400 shrink-0" />
                Joined {formatJoinedAt(host.joinedAt)}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                Roles: {host.roles.join(", ")}
              </div>
              {host.adminNote && (
                <p className="sm:col-span-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-gray-700">Admin note: </span>
                  {host.adminNote}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">ID verification request</h3>
          </div>

          {!verification ? (
            <p className="text-sm text-gray-500">
              This host has not submitted ID documents yet.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                    VERIFY_STATUS_STYLES[verification.status]
                  )}
                >
                  {verification.status}
                </span>
                <span className="text-xs text-gray-500">
                  {idTypeLabel(verification.idType)} · submitted{" "}
                  {new Date(verification.submittedAt).toLocaleString()}
                </span>
              </div>

              {verification.notes && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-semibold text-gray-900">Host notes: </span>
                  {verification.notes}
                </p>
              )}

              {verification.reviewNote && (
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <span className="font-semibold text-gray-900">Review note: </span>
                  {verification.reviewNote}
                </p>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Uploaded documents ({verification.documents.length})
                </p>
                {verification.documents.length === 0 ? (
                  <p className="text-sm text-gray-400">No files attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {verification.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="border rounded-xl overflow-hidden bg-white flex flex-col"
                      >
                        {doc.mimeType.startsWith("image/") ? (
                          <a
                            href={doc.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="relative aspect-[4/3] bg-gray-50 block"
                          >
                            <Image
                              src={doc.dataUrl}
                              alt={doc.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </a>
                        ) : (
                          <a
                            href={doc.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 aspect-[4/3] bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <FileText className="w-8 h-8 text-gray-400" />
                            <span className="text-xs font-medium">Open file</span>
                          </a>
                        )}
                        <div className="flex items-center gap-2 px-3 py-2 border-t bg-white min-w-0">
                          <span className="text-xs text-gray-700 truncate flex-1" title={doc.name}>
                            {doc.name}
                          </span>
                          <a
                            href={doc.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-green-700 hover:border-green-300 shrink-0"
                            aria-label={`View ${doc.name}`}
                            title="View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadDataUrlFile(doc.name, doc.dataUrl)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-green-700 hover:border-green-300 shrink-0"
                            aria-label={`Download ${doc.name}`}
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {verification.status === "pending" && canApprove && (
                <div className="space-y-3 border-t pt-4">
                  <label className="block">
                    <span className="block text-xs font-semibold text-gray-600 mb-1">
                      Review note (optional)
                    </span>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      placeholder="Reason for approval or rejection…"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleApproveDocs}
                      className="text-xs bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      Approve documents
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectDocs}
                      className="text-xs border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold"
                    >
                      Reject request
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {can("manage_hosts") && (
          <AdminHostStaffPermissionsPanel
            hostId={host.id}
            hostName={host.name}
            hostEmail={host.email}
          />
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Listings ({hostListings.length})
            </h3>
            <Link
              href="/admin/listings?tab=queue"
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              Open listings review
            </Link>
          </div>

          {hostListings.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
              This host has no listings yet.
            </div>
          ) : (
            <div className="space-y-3">
              {hostListings.map((listing) => (
                <article
                  key={listing.id}
                  className="bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="relative w-full sm:w-28 h-36 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border">
                    {listing.photoUrls[0] ? (
                      <Image
                        src={listing.photoUrls[0]}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900 truncate">
                        {listing.title}
                      </h4>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                          LISTING_STATUS_STYLES[listing.status]
                        )}
                      >
                        {listing.status === "approved" ? "live" : listing.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.district}, {listing.state}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {listing.parentCategory}
                        {listing.category ? ` · ${listing.category}` : ""}
                        {listing.subcategory && listing.subcategory !== listing.category
                          ? ` · ${listing.subcategory}`
                          : ""}
                      </span>
                      {(listing.rooms?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5" />
                          {listing.rooms!.length} room
                          {listing.rooms!.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/listing/${listing.id}`}
                    className="inline-flex items-center gap-1 text-xs border border-gray-300 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg font-medium shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View listing
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    
  );
}
