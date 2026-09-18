"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { BadgeCheck, CheckCircle, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GUEST_NAV } from "@/lib/guest/guest-nav";
import {
  fetchGuestVerificationFromApi,
  shouldUseSharedGuestVerification,
  submitGuestVerificationToApi,
} from "@/lib/guest/guest-verification-api";
import {
  getGuestVerificationStatus,
  submitGuestVerification,
} from "@/lib/guest/guest-verification-data";
import type {
  GuestIdDocumentType,
  GuestVerificationStatus,
} from "@/lib/guest/guest-verification-types";

export function GetVerifiedContent() {
  const t = useTranslations("account");
  const router = useRouter();
  const { user, loading, isHost } = useAuth();
  const [status, setStatus] = useState<GuestVerificationStatus>("none");
  const [idType, setIdType] = useState<GuestIdDocumentType>("emirates_id");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login?next=/account/verify");
      return;
    }
    if (isHost) {
      router.replace("/host/profile#verification");
    }
  }, [loading, user, isHost, router]);

  useEffect(() => {
    if (!user) return;
    if (shouldUseSharedGuestVerification()) {
      void fetchGuestVerificationFromApi(user.id)
        .then((request) => setStatus(request?.status ?? "none"))
        .catch(() => setStatus(getGuestVerificationStatus(user.id)));
      return;
    }
    setStatus(getGuestVerificationStatus(user.id));
  }, [user]);

  async function submitVerification() {
    if (!user) return;
    setSubmitting(true);
    const local = submitGuestVerification({
      userId: user.id,
      idType,
      notes,
    });
    try {
      if (shouldUseSharedGuestVerification()) {
        const saved = await submitGuestVerificationToApi(local);
        setStatus(saved.status);
      } else {
        setStatus(local.status);
      }
    } catch {
      setStatus(local.status);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || isHost) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <DashboardShell title="Guest" subtitle="Your account" tone="client" navItems={GUEST_NAV}>
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-display">
                {t("getVerifiedTitle")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{t("getVerifiedSubtitle")}</p>
            </div>
          </div>

          {status === "verified" && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0 text-blue-500" />
              {t("getVerifiedDone")}
            </div>
          )}

          {status === "pending" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
              {t("getVerifiedPending")}
            </div>
          )}

          {status === "rejected" && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3">
              Documents were not accepted. You can submit again below.
            </div>
          )}

          {(status === "none" || status === "rejected") && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitVerification();
              }}
              className="space-y-4"
            >
              <label className="block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                  {t("getVerifiedIdType")}
                </span>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as GuestIdDocumentType)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="emirates_id">{t("idEmirates")}</option>
                  <option value="passport">{t("idPassport")}</option>
                  <option value="trade_license">{t("idTradeLicense")}</option>
                </select>
              </label>

              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{t("getVerifiedUpload")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("getVerifiedUploadHint")}</p>
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {submitting ? "Submitting…" : t("getVerifiedSubmit")}
              </button>
            </form>
          )}

          <Link
            href="/account"
            className="block text-center text-sm text-gray-500 hover:text-green-700"
          >
            {t("backToProfile")}
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
