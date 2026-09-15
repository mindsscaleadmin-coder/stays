"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  buildHeaderNav,
  type HeaderNavItem,
  type NavGroup,
} from "@/lib/admin/taxonomy-nav";
import { cn } from "@/lib/utils";

export function useHeaderNav(): HeaderNavItem[] {
  const { data } = useAdminTaxonomy();
  return useMemo(() => buildHeaderNav(data), [data]);
}

function usableGroups(groups: NavGroup[]) {
  return groups.filter((group) => group.title !== "Quick Links");
}

export function MegaMenu() {
  const items = useHeaderNav();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const active = items.find((item) => item.id === activeId) ?? null;
  const groups = active ? usableGroups(active.groups) : [];
  const selected =
    groups.find((group) => group.title === groupTitle) ?? groups[0] ?? null;

  const open = (id: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (id !== activeId) {
      const next = items.find((item) => item.id === id);
      setGroupTitle(usableGroups(next?.groups ?? [])[0]?.title ?? null);
    }
    setActiveId(id);
  };
  const close = () => {
    timer.current = setTimeout(() => setActiveId(null), 160);
  };
  const dismiss = useCallback(() => setActiveId(null), []);

  const syncPanelTop = useCallback(() => {
    const header = navRef.current?.closest("header");
    const el = header ?? navRef.current;
    if (!el) return;
    setPanelTop(el.getBoundingClientRect().bottom);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  useEffect(() => {
    if (activeId && !items.some((item) => item.id === activeId)) {
      setActiveId(null);
    }
  }, [items, activeId]);

  useEffect(() => {
    if (!activeId) return;
    syncPanelTop();
    window.addEventListener("resize", syncPanelTop);
    window.addEventListener("scroll", syncPanelTop, true);
    return () => {
      window.removeEventListener("resize", syncPanelTop);
      window.removeEventListener("scroll", syncPanelTop, true);
    };
  }, [activeId, syncPanelTop]);

  useEffect(() => {
    if (!activeId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeId, dismiss]);

  if (items.length === 0) return null;

  const featuredImg = selected?.img || active?.img;
  const categoryHref = selected?.href || active?.href || "/listings";

  return (
    <div className="relative" onMouseLeave={close}>
      <nav ref={navRef} className="hidden lg:flex items-center" aria-label="Explore">
        {items.map((item) => {
          const isOpen = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => open(item.id)}
              onFocus={() => open(item.id)}
              aria-expanded={isOpen}
              aria-haspopup="true"
              className={cn(
                "relative flex items-center gap-1 px-3.5 h-10 text-[13px] font-medium tracking-tight transition-colors",
                isOpen ? "text-green-800" : "text-gray-600 hover:text-green-800"
              )}
            >
              {item.label}
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 opacity-60 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
              <span
                className={cn(
                  "absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-green-700 transition-opacity",
                  isOpen ? "opacity-100" : "opacity-0"
                )}
              />
            </button>
          );
        })}
      </nav>

      {active && selected ? (
        <div
          onMouseEnter={() => open(active.id)}
          className="fixed inset-x-0 z-[80]"
          style={{ top: panelTop }}
        >
          <div className="border-t border-gray-100 bg-white shadow-[0_28px_60px_-24px_rgba(27,67,50,0.28)]">
            <div className="site-page-container">
              <div className="grid grid-cols-12 h-[min(380px,calc(100vh-5.5rem))]">
                <div className="col-span-4 xl:col-span-3 border-e border-gray-100 bg-[#f6f4ef] -ms-[var(--page-gutter)] ps-[var(--page-gutter)] pe-0 xl:ms-0 xl:ps-0 flex flex-col min-h-0">
                  <div className="px-4 xl:px-5 pt-5 pb-3 shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {active.label}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-2 xl:px-3 pb-4">
                    {groups.map((group) => {
                      const isSelected = group.title === selected.title;
                      const linkUnit =
                        active.id === "destinations"
                          ? group.links.length === 1
                            ? "place"
                            : "places"
                          : group.links.length === 1
                            ? "type"
                            : "types";
                      return (
                        <button
                          key={group.title}
                          type="button"
                          onMouseEnter={() => setGroupTitle(group.title)}
                          onFocus={() => setGroupTitle(group.title)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                            isSelected
                              ? "bg-white text-green-900 shadow-sm"
                              : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                          )}
                        >
                          <span className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                            {group.img ? (
                              <Image
                                src={group.img}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : null}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate">
                              {group.title}
                            </span>
                            <span className="block text-[11px] text-gray-400 truncate">
                              {group.links.length} {linkUnit}
                            </span>
                          </span>
                          <ChevronRight
                            className={cn(
                              "w-3.5 h-3.5 shrink-0",
                              isSelected ? "text-green-700" : "text-gray-300"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-5 xl:col-span-6 px-7 py-6 flex flex-col min-h-0">
                  <div className="flex items-end justify-between gap-4 mb-5 shrink-0">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Browse
                      </p>
                      <h3 className="font-display text-xl font-semibold text-gray-900 mt-1 leading-tight">
                        {selected.title}
                      </h3>
                    </div>
                    <Link
                      href={categoryHref}
                      onClick={dismiss}
                      className="text-[12px] font-semibold text-green-800 hover:text-green-950 inline-flex items-center gap-1 shrink-0"
                    >
                      View all
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 flex-1 min-h-0 overflow-y-auto content-start">
                    {selected.links.map((link) => (
                      <li key={`${link.href}-${link.label}`}>
                        <Link
                          href={link.href}
                          onClick={dismiss}
                          className="group flex items-center justify-between gap-2 min-h-10 px-2.5 -mx-2.5 rounded-lg text-[13.5px] text-gray-600 hover:text-green-900 hover:bg-[#f3f7f4] transition-colors"
                        >
                          <span className="truncate">{link.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-green-700 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-4 shrink-0">
                    <Link
                      href={active.href}
                      onClick={dismiss}
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-800 hover:text-green-800"
                    >
                      All {active.label.toLowerCase()}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="col-span-3 py-6 pe-0 min-h-0">
                  <Link
                    href={categoryHref}
                    onClick={dismiss}
                    className="relative block h-full rounded-2xl overflow-hidden group"
                  >
                    {featuredImg ? (
                      <Image
                        src={featuredImg}
                        alt={selected.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="280px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-green-800" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                        Featured
                      </p>
                      <p className="font-display text-lg font-semibold leading-snug mt-1">
                        {selected.title}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold">
                        Explore
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
