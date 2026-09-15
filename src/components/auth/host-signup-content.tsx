"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { canManageListings } from "@/lib/auth/roles";
import { ensureAdminHostUser } from "@/lib/admin/user-data";
import { getDemoUser } from "@/lib/auth/demo-auth";
import { safeInternalPath } from "@/lib/auth/safe-next";
import { HostAuthShell, HostAuthInput } from "./host-auth-shell";

export function HostSignupContent() {
  const t = useTranslations("hostAuth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/host");
  const { signUpHostWithEmail, isDemo, loading, user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();

  const countries = useMemo(
    () => filterActiveCountries(taxonomy.countries),
    [taxonomy.countries]
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listingIntent =
    next.includes("/host/new-listing") || next.includes("/host/listings");

  useEffect(() => {
    if (!loading && user && canManageListings(user.roles)) {
      router.push(next);
    }
  }, [loading, user, router, next]);

  useEffect(() => {
    if (!country && countries.length === 1) {
      setCountry(countries[0].id);
    }
  }, [countries, country]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!country) {
      setError(t("countryRequired"));
      return;
    }
    if (!agreed) {
      setError(t("mustAgreeTerms"));
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await signUpHostWithEmail({
      email,
      password,
      fullName,
      phone: phone || undefined,
      country,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Demo mode: sync host into admin users with country.
    if (isDemo) {
      const demo = getDemoUser();
      if (demo) {
        ensureAdminHostUser({
          id: demo.id,
          name: demo.fullName,
          email: demo.email,
          phone: demo.phone,
          country: demo.country,
        });
      }
    }

    router.push(next);
  }

  const redirecting = !loading && !!user && canManageListings(user.roles);

  if (redirecting) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  const loginHref =
    next !== "/host" ? `/host/login?next=${encodeURIComponent(next)}` : "/host/login";

  return (
    <HostAuthShell
      title={t("signupTitle")}
      subtitle={listingIntent ? t("signupSubtitleListing") : t("signupSubtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href={loginHref} className="text-green-700 font-semibold hover:underline">
            {t("loginButton")}
          </Link>
        </>
      }
    >
      {listingIntent && (
        <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-3 py-2.5">
          {t("signupPromptListing")}
        </div>
      )}

      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          {t("demoModeSignup")}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <HostAuthInput
          label={t("fullName")}
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ahmed Al Farsi"
          autoComplete="name"
        />
        <HostAuthInput
          label={t("email")}
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="host@example.com"
          autoComplete="email"
        />
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("country")} <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">
              {countries.length === 0 ? t("noCountries") : t("selectCountry")}
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag ? `${c.flag} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <HostAuthInput
          label={t("phoneOptional")}
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 123 4567"
        />
        <HostAuthInput
          label={t("password")}
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <HostAuthInput
          label={t("confirmPassword")}
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          {t("agreeTerms")}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("signupButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600 hover:underline">
          {t("backToSite")}
        </Link>
      </p>
    </HostAuthShell>
  );
}
