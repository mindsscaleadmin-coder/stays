"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { canManageListings } from "@/lib/auth/roles";
import { goInternal, safeInternalPath } from "@/lib/auth/safe-next";
import { HostAuthShell, HostAuthInput } from "./host-auth-shell";

export function HostLoginContent() {
  const t = useTranslations("hostAuth");
  const searchParams = useSearchParams();
  const next = safeInternalPath(searchParams.get("next"), "/host");
  const restricted = searchParams.get("restricted") === "1";
  const { signInHostWithEmail, isDemo, loading, user, isHostAccountRestricted } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restricted || isHostAccountRestricted) return;
    if (!loading && user && !canManageListings(user.roles)) {
      goInternal(`/host/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!loading && user && canManageListings(user.roles)) {
      goInternal(next);
    }
  }, [loading, user, next, restricted, isHostAccountRestricted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signInHostWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    goInternal(next);
  }

  const redirecting =
    !restricted &&
    !isHostAccountRestricted &&
    !loading &&
    !!user &&
    canManageListings(user.roles);

  if (redirecting) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (!loading && user && canManageListings(user.roles) && (restricted || isHostAccountRestricted)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="bg-white border rounded-2xl p-6 max-w-md text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Account restricted</h2>
          <p className="text-sm text-gray-500">
            This host account is suspended or banned. Contact platform support if you believe
            this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <HostAuthShell
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href={next !== "/host" ? `/host/signup?next=${encodeURIComponent(next)}` : "/host/signup"}
            className="text-green-700 font-semibold hover:underline"
          >
            {t("signUp")}
          </Link>
        </>
      }
    >
      {isDemo && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
          {t("demoMode")} Staff/managers use the password set under Host → User / Staff.
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
        <HostAuthInput
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

      <p className="mt-6 text-center text-xs text-gray-400">
        <a href="/" className="hover:text-gray-600 hover:underline">
          {t("backToSite")}
        </a>
      </p>
    </HostAuthShell>
  );
}
