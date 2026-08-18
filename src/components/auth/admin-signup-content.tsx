"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { AdminAuthShell, AdminAuthInput } from "./admin-auth-shell";

export function AdminSignupContent() {
  const t = useTranslations("adminAuth");
  const router = useRouter();
  const { signUpAdminWithEmail, isDemo } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    setError(null);
    const result = await signUpAdminWithEmail({
      email,
      password,
      fullName,
      inviteCode,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/admin");
  }

  return (
    <AdminAuthShell
      title={t("signupTitle")}
      subtitle={t("signupSubtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href="/admin/login" className="text-slate-800 font-semibold hover:underline">
            {t("loginButton")}
          </Link>
        </>
      }
    >
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
        <AdminAuthInput
          label={t("fullName")}
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Admin User"
          autoComplete="name"
        />
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
          label={t("inviteCode")}
          id="inviteCode"
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="GREENFIELD-ADMIN"
        />
        <AdminAuthInput
          label={t("password")}
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <AdminAuthInput
          label={t("confirmPassword")}
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("signupButton")}
        </button>
      </form>
    </AdminAuthShell>
  );
}
