"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import {
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { filesToDataUrls } from "@/lib/listings/submission-data";
import { ensureAdminHostUser } from "@/lib/admin/user-data";
import { idTypeLabel } from "@/lib/host/verification-data";
import { useHostVerification } from "@/lib/host/use-host-verification";
import type {
  HostIdDocumentType,
  HostVerificationDocument,
} from "@/lib/host/verification-types";
import { HostTrustPanel } from "@/components/dashboard/host-trust-panel";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";

/** ID verification + trust panel — used on Host Profile. */
export function HostVerificationTrustSection() {
  const t = useTranslations("account");
  const { user } = useAuth();
  const { request, ready, submit } = useHostVerification(user?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idType, setIdType] = useState<HostIdDocumentType>("emirates_id");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<HostVerificationDocument[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && !request) setFormOpen(false);
  }, [ready, request]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files).slice(0, 4);
    const oversized = list.find((f) => f.size > 4 * 1024 * 1024);
    if (oversized) {
      setError("Each file must be under 4 MB.");
      return;
    }
    try {
      const urls = await filesToDataUrls(list, 4);
      const next: HostVerificationDocument[] = list.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: urls[i],
      }));
      setDocuments((prev) => [...prev, ...next].slice(0, 4));
    } catch {
      setError("Could not read one of the files. Try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (documents.length === 0) {
      setError("Upload at least one ID document.");
      return;
    }
    setSubmitting(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    submit({
      hostId: user.id,
      hostName: user.fullName,
      hostEmail: user.email,
      idType,
      notes,
      documents,
    });
    ensureAdminHostUser({
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      country: user.country,
    });
    setSubmitting(false);
    setFormOpen(false);
    setNotes("");
    setDocuments([]);
  }

  if (!user || !ready) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  const status = request?.status ?? "none";

  return (
    <div id="verification" className="space-y-5 scroll-mt-28">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Verification & Trust</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ID verification, farm certifications, and safety compliance.
          </p>
        </div>
        {status === "none" || status === "rejected" ? (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shrink-0"
          >
            <VerifiedBadge size="sm" />
            {status === "rejected" ? "Resubmit request" : t("getVerified")}
          </button>
        ) : null}
      </div>

      {status === "verified" && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
          <VerifiedBadge size="md" />
          {t("getVerifiedDone")}
        </div>
      )}

      {status === "pending" && request && (
        <VerificationRequestCard
          title="Verification request submitted"
          body={t("getVerifiedPending")}
          request={request}
          tone="pending"
        />
      )}

      {status === "rejected" && request && (
        <VerificationRequestCard
          title="Verification was declined"
          body={
            request.reviewNote ||
            "Your documents were not approved. You can upload new documents and resubmit."
          }
          request={request}
          tone="rejected"
        />
      )}

      {status === "none" && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Submit your ID documents so guests can trust your profile. Requests appear in the
          admin Host Control Panel for review.
        </div>
      )}

      <HostTrustPanel />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !submitting && setFormOpen(false)}
          />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between gap-3 z-10">
              <div>
                <h3 className="text-base font-bold text-gray-900">Request verification</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload documents for admin review
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setFormOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  {t("getVerifiedIdType")}
                </span>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as HostIdDocumentType)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="emirates_id">{t("idEmirates")}</option>
                  <option value="passport">{t("idPassport")}</option>
                  <option value="trade_license">{t("idTradeLicense")}</option>
                </select>
              </label>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  Documents
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{t("getVerifiedUpload")}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, or PDF · up to 4 files · 4 MB each
                  </p>
                </button>

                {documents.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-3 border border-gray-100 rounded-xl p-2.5"
                      >
                        {doc.mimeType.startsWith("image/") ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            <Image
                              src={doc.dataUrl}
                              alt={doc.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <span className="text-xs text-gray-700 truncate flex-1">{doc.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          aria-label={`Remove ${doc.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  {t("getVerifiedNotes")}
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder={t("getVerifiedNotesPlaceholder")}
                />
              </label>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("getVerifiedSubmit")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Old /host/verify route — send hosts to Profile → Verification. */
export function HostGetVerifiedContent() {
  const router = useRouter();
  const { user, loading, isHost } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/host/login?next=/host/profile%23verification");
      return;
    }
    if (!isHost) {
      router.replace("/account/verify");
      return;
    }
    router.replace("/host/profile#verification");
  }, [loading, user, isHost, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );
}

function VerificationRequestCard({
  title,
  body,
  request,
  tone,
}: {
  title: string;
  body: string;
  request: NonNullable<ReturnType<typeof useHostVerification>["request"]>;
  tone: "pending" | "rejected" | "verified";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-4",
        tone === "pending" && "bg-amber-50 border-amber-200",
        tone === "rejected" && "bg-red-50 border-red-200",
        tone === "verified" && "bg-blue-50 border-blue-200"
      )}
    >
      <div className="flex items-start gap-2">
        {tone === "pending" ? (
          <VerifiedBadge size="md" className="mt-0.5" />
        ) : tone === "rejected" ? (
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        ) : (
          <VerifiedBadge size="md" className="mt-0.5" />
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{body}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Document type
          </dt>
          <dd className="text-gray-800 mt-0.5">{idTypeLabel(request.idType)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Submitted
          </dt>
          <dd className="text-gray-800 mt-0.5">
            {new Date(request.submittedAt).toLocaleString()}
          </dd>
        </div>
        {request.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Notes
            </dt>
            <dd className="text-gray-800 mt-0.5">{request.notes}</dd>
          </div>
        ) : null}
      </dl>

      {request.documents.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Uploaded documents
          </p>
          <div className="flex flex-wrap gap-2">
            {request.documents.map((doc) =>
              doc.mimeType.startsWith("image/") ? (
                <a
                  key={doc.id}
                  href={doc.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative w-20 h-20 rounded-xl overflow-hidden border bg-white"
                >
                  <Image src={doc.dataUrl} alt={doc.name} fill className="object-cover" unoptimized />
                </a>
              ) : (
                <a
                  key={doc.id}
                  href={doc.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-white text-xs text-gray-700"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {doc.name}
                </a>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
