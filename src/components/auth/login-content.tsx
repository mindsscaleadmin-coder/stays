"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { canBook } from "@/lib/auth/roles";
import { getGuestSignupHref } from "@/lib/guest/checkout-access";
import { AuthShell, AuthInput } from "./auth-shell";

type Tab = "email" | "phone";

export function LoginContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";
  const bookingIntent = next.includes("/booking/");
  const { signInWithEmail, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, isDemo, loading, user } =
    useAuth();

  const [tab, setTab] = useState<Tab>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+971");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && canBook(user.roles)) {
      router.push(next);
    }
  }, [loading, user, router, next]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(next);
  }

  async function handleGoogle() {
    setSubmitting(true);
    setError(null);
    const result = await signInWithGoogle();
    setSubmitting(false);
    if (result.error) setError(result.error);
    else if (isDemo) router.push(next);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await sendPhoneOtp(phone);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setOtpSent(true);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await verifyPhoneOtp(phone, otp);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else router.push(next);
  }

  const redirecting = !loading && !!user && canBook(user.roles);
  const signupHref =
    next !== "/account" ? getGuestSignupHref(next) : "/signup";

  if (redirecting) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  return (
    <AuthShell
      title={t("loginTitle")}
      subtitle={bookingIntent ? t("loginSubtitleBooking") : t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href={signupHref} className="text-green-700 font-semibold hover:underline">
            {t("signUp")}
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

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        {(["email", "phone"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-green-700 shadow-sm" : "text-gray-500"
            }`}
          >
            {key === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {t(key === "email" ? "emailTab" : "phoneTab")}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {tab === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            label={t("password")}
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("loginButton")}
          </button>
        </form>
      ) : otpSent ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-gray-600">{t("otpSent", { phone })}</p>
          <AuthInput
            label={t("otpCode")}
            id="otp"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("verifyOtp")}
          </button>
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            {t("changePhone")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <AuthInput
            label={t("phone")}
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+971 50 123 4567"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("sendOtp")}
          </button>
        </form>
      )}

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
