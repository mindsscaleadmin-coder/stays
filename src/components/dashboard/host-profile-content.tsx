"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, User } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { HostVerificationTrustSection } from "@/components/dashboard/host-get-verified-content";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { filterActiveCountries, resolveCountryId } from "@/lib/admin/country-utils";
import { ensureAdminHostUser, findAdminUser } from "@/lib/admin/user-data";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostPublicProfile } from "@/lib/host/use-host-public-profile";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { getInitials } from "@/lib/auth/types";
import { VerifiedBadge } from "@/components/ui/verified-badge";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const RECOMMENDED_LOGO = "Square PNG/JPG · recommended 512×512 · max 2 MB";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readImageMeta(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new window.Image();
      img.onload = () =>
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function HostProfileContent() {
  const { user, loading, updateProfile } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const hostId = resolveHostId(user);
  const { request, ready: verifyReady } = useHostVerification(user?.id);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(
    () => filterActiveCountries(taxonomy.countries),
    [taxonomy.countries]
  );

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [language] = useState<"en">("en");
  const [hydrated, setHydrated] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [logoError, setLogoError] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);

  const {
    ready: publicReady,
    data: publicProfile,
    patch: patchPublic,
  } = useHostPublicProfile(hostId, user?.fullName ?? "");

  useEffect(() => {
    if (loading || !user) return;

    const adminHost = findAdminUser({ id: user.id, email: user.email });
    const rawCountry = user.country || adminHost?.country || "";
    const resolvedCountry =
      resolveCountryId(countries, rawCountry) || rawCountry;

    setFullName(user.fullName);
    setPhone(user.phone ?? adminHost?.phone ?? "");
    setCountry(resolvedCountry);
    setHydrated(true);

    // Persist signup country onto the auth profile when it was only on the admin record.
    if (
      !user.country &&
      resolvedCountry &&
      countries.some((c) => c.id === resolvedCountry)
    ) {
      void updateProfile({ country: resolvedCountry });
    }
  }, [loading, user, countries, updateProfile]);

  useEffect(() => {
    if (!publicProfile) return;
    setCompanyName(publicProfile.companyName ?? "");
  }, [publicProfile?.hostId, publicProfile?.companyName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#verification") return;
    const el = document.getElementById("verification");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hydrated, publicReady]);

  async function handleSaveAccount() {
    if (!user) return;
    if (!country) {
      setAccountMessage("Please select the country where you host.");
      return;
    }
    setSavingAccount(true);
    setAccountMessage("");
    try {
      const result = await updateProfile({
        fullName: fullName.trim() || user.fullName,
        phone: phone.trim() || undefined,
        country,
        language,
      });
      if (result.error) throw new Error(result.error);
      ensureAdminHostUser({
        id: user.id,
        name: fullName.trim() || user.fullName,
        email: user.email,
        phone: phone.trim() || undefined,
        country,
      });
      if (publicProfile) {
        patchPublic({ companyName: companyName.trim() });
      }
      setAccountMessage("Account details saved.");
      setTimeout(() => setAccountMessage(""), 2500);
    } catch (err) {
      setAccountMessage(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleLogoFile(file: File | undefined) {
    if (!file || !publicProfile) return;
    setLogoError("");
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file (PNG, JPG, or WEBP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(
        `Logo is too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_LOGO_BYTES)}.`
      );
      return;
    }
    setLogoBusy(true);
    try {
      const meta = await readImageMeta(file);
      patchPublic({
        logoUrl: meta.dataUrl,
        logoFileName: file.name,
        logoBytes: file.size,
        logoWidth: meta.width,
        logoHeight: meta.height,
      });
    } catch {
      setLogoError("Could not upload logo. Try another image.");
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function removeLogo() {
    if (!publicProfile) return;
    setLogoError("");
    patchPublic({
      logoUrl: undefined,
      logoFileName: undefined,
      logoBytes: undefined,
      logoWidth: undefined,
      logoHeight: undefined,
    });
  }

  if (loading || !user || !hydrated || !publicReady) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  const verifyStatus = verifyReady ? request?.status : undefined;
  const logoUrl = publicProfile?.logoUrl;
  const logoSizeLabel =
    logoUrl && publicProfile?.logoWidth && publicProfile?.logoHeight
      ? `${publicProfile.logoWidth}×${publicProfile.logoHeight}px` +
        (publicProfile.logoBytes != null ? ` · ${formatBytes(publicProfile.logoBytes)}` : "")
      : null;

  return (
    <HostDashboardShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Host profile</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your account details and how you appear to guests.
          </p>
        </div>

        <section className="bg-white rounded-2xl border p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="shrink-0 space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void handleLogoFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={logoBusy || !publicProfile}
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-14 h-14 rounded-2xl overflow-hidden bg-green-700 text-white flex items-center justify-center text-lg font-bold border border-green-800/10 group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500/40"
                  aria-label={logoUrl ? "Change logo" : "Upload logo"}
                  title={logoUrl ? "Change logo" : "Upload logo"}
                >
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt="Host logo"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    getInitials(fullName || user.fullName)
                  )}
                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                    {logoBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-white" />
                    )}
                  </span>
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={logoBusy || !publicProfile}
                    onClick={() => logoInputRef.current?.click()}
                    className="text-[11px] font-semibold text-green-700 hover:text-green-800 disabled:opacity-50 text-start"
                  >
                    {logoUrl ? "Change logo" : "Upload logo"}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 text-start"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {fullName || user.fullName}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-800 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    <User className="w-3 h-3" /> Host
                  </span>
                  {verifyStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-blue-500 border border-blue-500 px-2 py-0.5 rounded-full">
                      <VerifiedBadge size="sm" /> Verified
                    </span>
                  )}
                  {verifyStatus === "pending" && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      Verification pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">{RECOMMENDED_LOGO}</p>
                {logoSizeLabel && (
                  <p className="text-[11px] font-medium text-gray-600 mt-1">
                    Current logo: {logoSizeLabel}
                    {publicProfile?.logoFileName ? ` · ${publicProfile.logoFileName}` : ""}
                  </p>
                )}
                {logoError && <p className="text-[11px] text-red-600 mt-1">{logoError}</p>}
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 mb-3">Account details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">Company name</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Green Valley Farms LLC"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">Email</span>
              <input
                value={user.email}
                disabled
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">
                Country <span className="text-red-500">*</span>
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">
                  {countries.length === 0 ? "No countries configured" : "Select your country"}
                </option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag ? `${c.flag} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">Language</span>
              <p className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700">
                English
              </p>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleSaveAccount()}
            disabled={savingAccount}
            className="bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 mb-6"
          >
            {savingAccount ? "Saving…" : "Save account details"}
          </button>
          {accountMessage && (
            <p className="text-xs text-gray-500 -mt-4 mb-6">{accountMessage}</p>
          )}

          <div className="border-t border-gray-100 pt-5">
            <HostVerificationTrustSection />
          </div>
        </section>

        {publicProfile && (
          <section className="bg-white rounded-2xl border p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Public host profile</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Shown to guests on your listings and booking messages. Changes save automatically.
              </p>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">
                Display name / farm brand
              </span>
              <input
                value={publicProfile.displayName}
                onChange={(e) => patchPublic({ displayName: e.target.value })}
                placeholder={fullName || "Your farm or host name"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">City / region</span>
              <input
                value={publicProfile.city}
                onChange={(e) => patchPublic({ city: e.target.value })}
                placeholder="e.g. Al Ain, UAE"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">About you</span>
              <textarea
                value={publicProfile.bio}
                onChange={(e) => patchPublic({ bio: e.target.value })}
                rows={4}
                placeholder="Tell guests about your farm, hospitality style, and what makes a stay special."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[100px]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-600 mb-1.5">
                WhatsApp (optional)
              </span>
              <input
                value={publicProfile.whatsapp ?? ""}
                onChange={(e) => patchPublic({ whatsapp: e.target.value })}
                placeholder="+971 50 123 4567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publicProfile.preferWhatsapp}
                onChange={(e) => patchPublic({ preferWhatsapp: e.target.checked })}
                className="rounded border-gray-300 text-green-700 focus:ring-green-600"
              />
              <span className="text-sm text-gray-700">Prefer WhatsApp for guest contact</span>
            </label>
          </section>
        )}
      </div>
    </HostDashboardShell>
  );
}
