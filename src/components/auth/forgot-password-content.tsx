"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthShell, AuthInput } from "./auth-shell";

export function ForgotPasswordContent() {
  const t = useTranslations("auth");
  const { sendPasswordResetEmail, isDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendPasswordResetEmail(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      footer={
        <Link href="/login" className="inline-flex items-center gap-1 hover:text-gray-700">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("backToLogin")}
        </Link>
      }
    >
      {isDemo && !sent && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          {t("demoModeForgot")}
        </div>
      )}

      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-6 h-6 text-green-700" />
          </div>
          <p className="text-sm text-gray-600">{t("resetEmailSent", { email })}</p>
          {isDemo && (
            <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg px-3 py-2">
              {t("demoResetNote")}
            </p>
          )}
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("sendResetLink")}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
