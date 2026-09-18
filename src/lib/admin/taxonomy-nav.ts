import type { TaxonomyData } from "@/lib/admin/taxonomy-types";
import { isFilterEnabled } from "@/lib/admin/taxonomy-types";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import { DESTINATIONS, POPULAR_CATEGORIES, POPULAR_EXPERIENCES, POPULAR_VENUES } from "@/lib/mock/data";

export type NavLink = { label: string; href: string };
export type NavGroup = { title: string; href?: string; img?: string; links: NavLink[] };
export type HeaderNavItem = {
  id: string;
  label: string;
  href: string;
  img?: string;
  groups: NavGroup[];
};

export type TaxonomyCard = {
  id: string;
  name: string;
  href: string;
  img: string;
  subtitle?: string;
};

const FALLBACK_IMGS = [
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  "https://images.unsplash.com/photo-1720430498633-a8908d8706d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  "https://images.unsplash.com/photo-1654145268052-6b68f1d94519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  "https://images.unsplash.com/photo-1738315452605-f3ff2d162631?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  "https://images.unsplash.com/photo-1657383543368-7d929944be6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  "https://images.unsplash.com/photo-1762098773943-fe46ba151683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
];

export function tabEnabled(data: TaxonomyData, id: string): boolean {
  return isFilterEnabled(data.mainTabs.find((t) => t.id === id));
}

export function tabLabel(data: TaxonomyData, id: string, fallback: string): string {
  return data.mainTabs.find((t) => t.id === id)?.label?.trim() || fallback;
}

export function listingsHref(params: {
  parent?: string;
  category?: string;
  subcategory?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  q?: string;
}): string {
  const search = new URLSearchParams();
  if (params.parent) search.set("parent", params.parent);
  if (params.category) search.set("category", params.category);
  if (params.subcategory) search.set("subcategory", params.subcategory);
  if (params.country) search.set("country", params.country);
  if (params.state) search.set("state", params.state);
  if (params.district) search.set("district", params.district);
  if (params.city) search.set("city", params.city);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

function imageForName(
  name: string,
  catalog: { name: string; img: string }[]
): string {
  const needle = name.trim().toLowerCase();
  const exact = catalog.find((c) => c.name.toLowerCase() === needle);
  if (exact) return exact.img;
  const partial = catalog.find(
    (c) => needle.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(needle)
  );
  if (partial) return partial.img;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % FALLBACK_IMGS.length;
  return FALLBACK_IMGS[hash];
}

function enabledParents(data: TaxonomyData) {
  return data.parents.filter((p) => p.enabled !== false);
}

/** Parent categories for the home hero tab bar (excludes Destinations). */
export function enabledParentTabs(data: TaxonomyData) {
  if (!tabEnabled(data, "parent")) return [];
  return enabledParents(data);
}

function parentCategories(data: TaxonomyData, parentId: string) {
  if (!tabEnabled(data, "category")) return [];
  return data.categories.filter((c) => c.enabled !== false && c.parentId === parentId);
}

function categorySubs(data: TaxonomyData, categoryId: string) {
  if (!tabEnabled(data, "subcategory")) return [];
  return data.subcategories.filter((sc) => sc.enabled !== false && sc.categoryId === categoryId);
}

function catalogForParent(name: string) {
  if (/experience/i.test(name)) return POPULAR_EXPERIENCES;
  if (/event/i.test(name) || /venue/i.test(name)) return POPULAR_VENUES;
  return POPULAR_CATEGORIES;
}

function parentNavItem(data: TaxonomyData, parent: { id: string; name: string }): HeaderNavItem {
  const catalog = catalogForParent(parent.name);
  const cats = parentCategories(data, parent.id);
  const groups: NavGroup[] = cats.map((cat) => {
    const subs = categorySubs(data, cat.id);
    const href = listingsHref({ parent: parent.name, category: cat.name });
    const links: NavLink[] =
      subs.length > 0
        ? subs.map((sc) => ({
            label: sc.name,
            href: listingsHref({
              parent: parent.name,
              category: cat.name,
              subcategory: sc.name,
            }),
          }))
        : [{ label: `All ${cat.name}`, href }];
    return {
      title: cat.name,
      href,
      img: imageForName(cat.name, catalog),
      links,
    };
  });

  return {
    id: parent.id,
    label: parent.name,
    href: listingsHref({ parent: parent.name }),
    img: imageForName(parent.name, catalog),
    groups,
  };
}

/** Header / mega-menu items from the live Filter taxonomy. */
export function buildHeaderNav(data: TaxonomyData): HeaderNavItem[] {
  if (!tabEnabled(data, "parent")) return [];
  return enabledParents(data).map((parent) => parentNavItem(data, parent));
}

function findParentByHint(data: TaxonomyData, hint: RegExp, fallbackId?: string) {
  const parents = enabledParents(data);
  return (
    parents.find((p) => p.id === fallbackId) ||
    parents.find((p) => hint.test(p.name)) ||
    null
  );
}

export function taxonomyParentCards(data: TaxonomyData, limit = 6): TaxonomyCard[] {
  if (!tabEnabled(data, "parent")) return [];
  const parents = enabledParents(data);
  const cats = tabEnabled(data, "category")
    ? data.categories.filter((c) => c.enabled !== false)
    : [];
  const cards: TaxonomyCard[] = [];
  for (const parent of parents) {
    if (cards.length >= limit) break;
    cards.push({
      id: parent.id,
      name: parent.name,
      href: listingsHref({ parent: parent.name }),
      img: imageForName(parent.name, POPULAR_CATEGORIES),
    });
  }
  for (const cat of cats) {
    if (cards.length >= limit) break;
    const parent = parents.find((p) => p.id === cat.parentId);
    cards.push({
      id: cat.id,
      name: cat.name,
      href: listingsHref({
        parent: parent?.name,
        category: cat.name,
      }),
      img: imageForName(cat.name, POPULAR_CATEGORIES),
    });
  }
  return cards;
}

function cardsForParent(
  data: TaxonomyData,
  parent: { id: string; name: string } | null,
  catalog: { name: string; img: string }[],
  limit = 6
): TaxonomyCard[] {
  if (!parent) return [];
  const cats = parentCategories(data, parent.id);
  const fromCats = cats.slice(0, limit).map((cat) => ({
    id: cat.id,
    name: cat.name,
    href: listingsHref({ parent: parent.name, category: cat.name }),
    img: imageForName(cat.name, catalog),
  }));
  if (fromCats.length > 0) return fromCats;
  const subs = data.subcategories
    .filter((sc) => sc.enabled !== false && sc.parentId === parent.id)
    .slice(0, limit);
  return subs.map((sc) => ({
    id: sc.id,
    name: sc.name,
    href: listingsHref({ parent: parent.name, subcategory: sc.name }),
    img: imageForName(sc.name, catalog),
  }));
}

export function taxonomyExperienceCards(data: TaxonomyData, limit = 6): TaxonomyCard[] {
  const parent = findParentByHint(data, /experience/i, "p2");
  return cardsForParent(data, parent, POPULAR_EXPERIENCES, limit);
}

export function taxonomyVenueCards(data: TaxonomyData, limit = 6): TaxonomyCard[] {
  const parent = findParentByHint(data, /event|venue/i, "p3");
  if (!parent) return [];
  const venueCat = data.categories.find(
    (c) => c.enabled !== false && c.parentId === parent.id && /venue/i.test(c.name)
  );
  const subs = venueCat ? categorySubs(data, venueCat.id) : [];
  if (subs.length > 0) {
    return subs.slice(0, limit).map((sc) => ({
      id: sc.id,
      name: sc.name,
      href: listingsHref({
        parent: parent.name,
        category: venueCat?.name,
        subcategory: sc.name,
      }),
      img: imageForName(sc.name, POPULAR_VENUES),
    }));
  }
  return cardsForParent(data, parent, POPULAR_VENUES, limit);
}

export function taxonomyDestinationCards(data: TaxonomyData, limit = 6): TaxonomyCard[] {
  const countries = filterActiveCountries(data.countries);
  const states = tabEnabled(data, "state")
    ? data.states.filter((s) => s.enabled !== false)
    : [];
  const districts = tabEnabled(data, "district")
    ? data.districts.filter((d) => d.enabled !== false)
    : [];

  const fromDistricts = districts.slice(0, limit).map((d) => {
    const state = data.states.find((s) => s.id === d.stateId);
    const country = countries.find((c) => c.id === state?.countryId);
    return {
      id: d.id,
      name: d.name,
      href: listingsHref({
        country: country?.name,
        state: state?.name,
        district: d.name,
        q: d.name,
      }),
      img: imageForName(d.name, DESTINATIONS),
      subtitle: [state?.name, country?.name].filter(Boolean).join(" · ") || undefined,
    };
  });
  if (fromDistricts.length > 0) return fromDistricts;

  const fromStates = states.slice(0, limit).map((s) => {
    const country = countries.find((c) => c.id === s.countryId);
    return {
      id: s.id,
      name: s.name,
      href: listingsHref({ country: country?.name, state: s.name, q: s.name }),
      img: imageForName(s.name, DESTINATIONS),
      subtitle: country?.name,
    };
  });
  if (fromStates.length > 0) return fromStates;

  return countries.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    href: listingsHref({ country: c.name }),
    img: imageForName(c.name, DESTINATIONS),
  }));
}

export function taxonomyExperienceParentName(data: TaxonomyData): string | null {
  return findParentByHint(data, /experience/i, "p2")?.name ?? null;
}

export function taxonomyVenueParentName(data: TaxonomyData): string | null {
  return findParentByHint(data, /event|venue/i, "p3")?.name ?? null;
}
