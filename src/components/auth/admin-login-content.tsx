"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { AdminAuthShell, AdminAuthInput } from "./admin-auth-shell";

export function AdminLoginContent() {
  const t = useTranslations("adminAuth");
  const router = useRouter();
  const { signInAdminWithEmail, isDemo, isAdmin, loading, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.push("/admin");
    }
  }, [loading, user, isAdmin, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signInAdminWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Hard navigate so auth state (and cleared impersonation) is fully applied.
    window.location.href = "/admin";
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <AdminAuthShell
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/admin/signup" className="text-slate-800 font-semibold hover:underline">
            {t("signUp")}
          </Link>
        </>
      }
    >
      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 space-y-1">
          <p>{t("demoMode")}</p>
          <p>
            Seed Super Admin <code className="font-mono">admin@greenfield.ae</code> can use any
            password until one is set. Sub-admin / Support need a password from Users → Staff
            access.
          </p>
        </div>
      )}

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
        <AdminAuthInput
          label={t("password")}
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/admin/forgot-password"
            className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("loginButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600 hover:underline">
          {t("backToSite")}
        </Link>
      </p>
    </AdminAuthShell>
  );
}
