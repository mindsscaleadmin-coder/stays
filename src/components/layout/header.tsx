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
  ShoppingBag,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { MegaMenu, MEGA_DATA } from "./mega-menu";
import { useCountry } from "@/components/providers/country-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { ListPropertyLink } from "@/components/auth/list-property-link";
import { getInitials } from "@/lib/auth/types";
import {
  BOOKING_CART_SYNC_EVENT,
  getCartCount,
} from "@/lib/guest/booking-cart";
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
      <div className="hidden md:flex items-center gap-1.5 border border-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1.5 rounded-lg select-none">
        <span className="text-base leading-none">{country.flag}</span>
        <span>{country.code}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative hidden md:block">
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

export function Header() {
  const t = useTranslations("common");
  const ta = useTranslations("auth");
  const tAccount = useTranslations("account");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, isHost, signOut } = useAuth();
  const dashboardChrome = isDashboardChromePath(pathname);
  const [hostHref, setHostHref] = useState("/host/login");
  const [profileHref, setProfileHref] = useState("/account");
  const [verifyHref, setVerifyHref] = useState("/account/verify");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const mobileNavLabels: Record<string, string> = {
    Stays: tNav("properties"),
    Destinations: tNav("destinations"),
    Venues: tNav("venues"),
    Experiences: tNav("experiences"),
  };

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

  useEffect(() => {
    function refreshCart() {
      setCartCount(getCartCount());
    }
    refreshCart();
    window.addEventListener(BOOKING_CART_SYNC_EVENT, refreshCart);
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-booking-cart") refreshCart();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BOOKING_CART_SYNC_EVENT, refreshCart);
      window.removeEventListener("storage", onStorage);
    };
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
        "bg-white shadow-sm sticky top-0 z-[70]",
        dashboardChrome && "lg:ms-[272px] lg:border-s lg:border-gray-100"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-green-700 rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-green-800 font-bold text-base leading-tight font-display">
              {t("brandShort")}
            </div>
            <div className="text-green-600 text-[10px] leading-tight tracking-wide">
              {t("brandTagline")}
            </div>
          </div>
        </Link>

        <div className="flex-1 flex justify-center overflow-visible">
          <MegaMenu />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/cart"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 transition-colors"
            aria-label="Cart"
            title="Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>
          <CountrySwitcher />
          <Link
            href={isAdmin ? "/admin" : "/admin/login"}
            className="hidden md:flex items-center gap-1 border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> {t("admin")}
          </Link>
          <Link
            href={hostHref}
            className="hidden md:flex items-center gap-1 border border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Home className="w-3.5 h-3.5" /> {t("host")}
          </Link>
          <ListPropertyLink className="hidden md:inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
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
                <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {user.fullName.split(" ")[0]}
                </span>
                <ChevronDown
                  className={`hidden md:block w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
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
              className="hidden md:inline-flex items-center gap-1.5 border border-gray-200 hover:border-green-400 text-gray-600 hover:text-green-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {ta("loginButton")}
            </Link>
          )}
          <button
            type="button"
            className="lg:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t overflow-y-auto max-h-[75vh]">
          {(["Stays", "Destinations", "Venues", "Experiences"] as const).map((key) => {
            const groups = MEGA_DATA[key];
            return (
              <div key={key} className="border-b border-gray-50">
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpanded(mobileExpanded === key ? null : key)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {mobileNavLabels[key] ?? key}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${mobileExpanded === key ? "rotate-180" : ""}`}
                  />
                </button>
                {mobileExpanded === key && groups ? (
                  <div className="bg-gray-50 px-4 pb-3">
                    {Object.entries(groups).map(([group, items]) => (
                      <div key={group} className="mt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                          {group}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map(({ label, to }) => (
                            <Link
                              key={label}
                              href={to}
                              onClick={() => setMenuOpen(false)}
                              className="text-xs bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 px-2.5 py-1 rounded-full transition-colors"
                            >
                              {label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="p-4 border-t border-gray-100 space-y-2">
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
