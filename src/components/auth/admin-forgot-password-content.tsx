"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { AdminAuthShell, AdminAuthInput } from "./admin-auth-shell";

export function AdminForgotPasswordContent() {
  const t = useTranslations("adminAuth");
  const { sendPasswordResetEmail, isDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendPasswordResetEmail(email, "/admin/reset-password");
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <AdminAuthShell
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      footer={
        <Link href="/admin/login" className="inline-flex items-center gap-1 hover:text-slate-800">
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
            <AdminAuthInput
              label={t("email")}
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@greenfield.ae"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("sendResetLink")}
            </button>
          </form>
        </>
      )}
    </AdminAuthShell>
  );
}
