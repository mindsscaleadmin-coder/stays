"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { canBook } from "@/lib/auth/roles";
import { getGuestLoginHref } from "@/lib/guest/checkout-access";
import { AuthShell, AuthInput } from "./auth-shell";

export function SignupContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";
  const bookingIntent = next.includes("/booking/");
  const { signUpWithEmail, signInWithGoogle, isDemo, loading, user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && canBook(user.roles)) {
      router.push(next);
    }
  }, [loading, user, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!agreed) {
      setError(t("mustAgreeTerms"));
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await signUpWithEmail({
      email,
      password,
      fullName,
      phone: phone || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(next);
  }

  async function handleGoogle() {
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);
    if (!result.error && isDemo) router.push(next);
  }

  const redirecting = !loading && !!user && canBook(user.roles);
  const loginHref = next !== "/account" ? getGuestLoginHref(next) : "/login";

  if (redirecting) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <AuthShell
      title={t("signupTitle")}
      subtitle={bookingIntent ? t("signupSubtitleBooking") : t("signupSubtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href={loginHref} className="text-green-700 font-semibold hover:underline">
            {t("loginButton")}
          </Link>
        </>
      }
    >
      {bookingIntent && (
        <div className="mb-4 bg-green-50 border border-green-100 text-green-800 text-sm rounded-lg px-3 py-2.5">
          {t("bookingPrompt")}
        </div>
      )}

      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          {t("demoMode")}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label={t("fullName")}
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ahmed Al Farsi"
          autoComplete="name"
        />
        <AuthInput
          label={t("email")}
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <AuthInput
          label={t("phoneOptional")}
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+971 50 123 4567"
        />
        <AuthInput
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
        <AuthInput
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

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">{t("orContinueWith")}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full border border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t("googleButton")}
      </button>
    </AuthShell>
  );
}
