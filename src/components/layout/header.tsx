"use client";

import { useState, useRef, useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import {
  Leaf,
  Home,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  User,
  BadgeCheck,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { MegaMenu, useHeaderNav } from "./mega-menu";
import { useCountry } from "@/components/providers/country-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { ListPropertyLink } from "@/components/auth/list-property-link";
import { getInitials } from "@/lib/auth/types";
import {
  isDashboardChromePath,
} from "@/lib/layout/dashboard-chrome";
import { cn } from "@/lib/utils";

function CountrySwitcher() {
  const { country, setCountry, enabledCountries, allCountries } = useCountry();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (enabledCountries.length <= 1) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1.5 rounded-lg select-none">
        <span className="text-base leading-none">{country.flag}</span>
        <span>{country.code}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span>{country.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full end-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 w-56 overflow-hidden">
          <div className="py-1.5">
            {allCountries.map((c) => {
              const isEnabled = enabledCountries.some((ec) => ec.code === c.code);
              const isActive = country.code === c.code;
              const name = c.name;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    if (isEnabled) {
                      setCountry(c.code);
                      setOpen(false);
                    }
                  }}
                  disabled={!isEnabled}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-700"
                      : isEnabled
                        ? "hover:bg-gray-50 text-gray-700"
                        : "opacity-40 cursor-not-allowed text-gray-400"
                  }`}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{name}</div>
                    <div className="text-[10px] text-gray-400">
                      {c.currency} · {c.dialCode}
                    </div>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full shrink-0" />
                  )}
                  {!isEnabled && c.comingSoon && (
                    <span className="text-[9px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileCountryPicker({ onPick }: { onPick: () => void }) {
  const { country, setCountry, enabledCountries } = useCountry();
  if (enabledCountries.length === 0) return null;

  return (
    <div className="pb-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        Region
      </p>
      <div className="flex flex-wrap gap-1.5">
        {enabledCountries.map((c) => {
          const active = country.code === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCountry(c.code);
                onPick();
              }}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors",
                active
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-gray-200 text-gray-600 hover:border-green-400"
              )}
            >
              <span>{c.flag}</span>
              {c.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Header() {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  const tAccount = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, isHost, signOut } = useAuth();
  const dashboardChrome = isDashboardChromePath(pathname);
  const headerNav = useHeaderNav();
  const [hostHref, setHostHref] = useState("/host/login");
  const [profileHref, setProfileHref] = useState("/account");
  const [verifyHref, setVerifyHref] = useState("/account/verify");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHostHref(isHost ? "/host" : "/host/login");
  }, [isHost]);

  useEffect(() => {
    if (isAdmin) {
      setProfileHref("/admin");
      return;
    }
    if (isHost) {
      setProfileHref("/host/profile");
      setVerifyHref("/host/profile#verification");
      return;
    }
    setProfileHref("/account");
    setVerifyHref("/account/verify");
  }, [isAdmin, isHost]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    setUserMenuOpen(false);
    router.push("/");
  }

  return (
    <header
      className={cn(
        "bg-white shadow-sm sticky top-0 z-[70] pt-[env(safe-area-inset-top)]",
        dashboardChrome && "lg:border-b lg:border-gray-100"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="relative z-[80] flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-green-700 rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-green-800 font-bold text-sm sm:text-base leading-tight font-display truncate">
              {t("brandShort")}
            </div>
            <div className="hidden min-[400px]:block text-green-600 text-[10px] leading-tight tracking-wide">
              {t("brandTagline")}
            </div>
          </div>
        </Link>

        <div className="flex-1 flex justify-center overflow-visible">
          {!dashboardChrome ? <MegaMenu /> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CountrySwitcher />
          <Link
            href={isAdmin ? "/admin" : "/admin/login"}
            className="hidden lg:flex items-center gap-1 border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> {t("admin")}
          </Link>
          <Link
            href={hostHref}
            className="hidden lg:flex items-center gap-1 border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Home className="w-3.5 h-3.5" /> {t("host")}
          </Link>
          <ListPropertyLink className="hidden lg:inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {t("listProperty")}
          </ListPropertyLink>
          {!loading && user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1.5 pe-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                title={user.fullName}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(user.fullName)}
                </div>
                <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {user.fullName.split(" ")[0]}
                </span>
                <ChevronDown
                  className={`hidden lg:block w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute top-full end-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 w-52 overflow-hidden py-1.5"
                >
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    href={profileHref}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    {tAccount("tabs.profile")}
                  </Link>
                  {isHost && !isAdmin && (
                    <Link
                      href={verifyHref}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <BadgeCheck className="w-4 h-4 text-gray-400" />
                      {tAccount("getVerified")}
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {tAccount("signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden lg:inline-flex items-center gap-1.5 border border-gray-200 hover:border-green-400 text-gray-600 hover:text-green-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {ta("loginButton")}
            </Link>
          )}
          <button
            type="button"
            className="lg:hidden p-2 -me-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t overflow-y-auto max-h-[75vh]">
          {headerNav.map((item) => (
              <div key={item.id} className="border-b border-gray-50">
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpanded(mobileExpanded === item.id ? null : item.id)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {item.label}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${mobileExpanded === item.id ? "rotate-180" : ""}`}
                  />
                </button>
                {mobileExpanded === item.id ? (
                  <div className="bg-gray-50 px-4 pb-3">
                    {item.groups.map((group) => (
                      <div key={group.title} className="mt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                          {group.title}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.links.map((link) => (
                            <Link
                              key={`${link.href}-${link.label}`}
                              href={link.href}
                              onClick={() => setMenuOpen(false)}
                              className="text-xs bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 px-2.5 py-1 rounded-full transition-colors"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <MobileCountryPicker onPick={() => setMenuOpen(false)} />
            <Link
              href={isAdmin ? "/admin" : "/admin/login"}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700 px-4 py-2.5 rounded-xl transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> {t("admin")}
            </Link>
            <Link
              href={hostHref}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700 px-4 py-2.5 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" /> {t("host")}
            </Link>
            <ListPropertyLink
              className="flex items-center justify-center w-full bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {t("listProperty")}
            </ListPropertyLink>
            {user ? (
              <>
                <Link
                  href={profileHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700 px-4 py-2.5 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4" />
                  {tAccount("tabs.profile")}
                </Link>
                {isHost && !isAdmin && (
                  <Link
                    href={verifyHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    {tAccount("getVerified")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {tAccount("signOut")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700 px-4 py-2.5 rounded-xl transition-colors"
              >
                {ta("loginButton")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
