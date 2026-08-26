import type { SubmittedListing } from "./submission-types";

export type ListingRelabelChanges = {
  country?: { from: string; to: string };
  state?: { from: string; to: string };
  district?: { from: string; to: string };
  city?: { from: string; to: string };
  parentCategory?: { from: string; to: string };
  category?: { from: string; to: string };
  subcategory?: { from: string; to: string };
  extraFilter?: { from: string; to: string };
  customFilter?: {
    fromLabel?: string;
    toLabel?: string;
    fromValue?: string;
    toValue?: string;
  };
};

function namesEqual(a: string | undefined, b: string) {
  return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

function hasWork(changes: ListingRelabelChanges): boolean {
  const pairs = [
    changes.country,
    changes.state,
    changes.district,
    changes.city,
    changes.parentCategory,
    changes.category,
    changes.subcategory,
    changes.extraFilter,
  ];
  if (pairs.some((pair) => pair && pair.from && pair.from !== pair.to)) return true;
  const custom = changes.customFilter;
  if (!custom) return false;
  if (custom.fromLabel && custom.fromLabel !== (custom.toLabel ?? custom.fromLabel)) {
    return true;
  }
  if (custom.fromValue && custom.fromValue !== (custom.toValue ?? custom.fromValue)) {
    return true;
  }
  return false;
}

/** Copy a listing and rewrite stored Filter names. Returns the same object if nothing changed. */
export function relabelListing(
  listing: SubmittedListing,
  changes: ListingRelabelChanges
): SubmittedListing {
  if (!hasWork(changes)) return listing;
  let row = listing;
  const apply = (
    field: "country" | "state" | "district" | "parentCategory" | "category" | "subcategory" | "city",
    pair?: { from: string; to: string }
  ) => {
    if (!pair?.from || pair.from === pair.to) return;
    if (namesEqual(row[field], pair.from)) {
      row = { ...row, [field]: pair.to };
    }
  };
  apply("country", changes.country);
  apply("state", changes.state);
  apply("district", changes.district);
  apply("city", changes.city ?? changes.district);
  apply("parentCategory", changes.parentCategory);
  apply("category", changes.category);
  apply("subcategory", changes.subcategory);
  if (changes.extraFilter && row.advancedFilters.length > 0) {
    const filters = row.advancedFilters.map((f) =>
      namesEqual(f, changes.extraFilter!.from) ? changes.extraFilter!.to : f
    );
    if (filters.some((f, i) => f !== row.advancedFilters[i])) {
      row = { ...row, advancedFilters: filters };
    }
  }
  if (changes.customFilter && row.customFilters.length > 0) {
    const filters = row.customFilters.map((f) => {
      let label = f.label;
      let value = f.value;
      if (
        changes.customFilter!.fromLabel &&
        namesEqual(label, changes.customFilter!.fromLabel)
      ) {
        label = changes.customFilter!.toLabel ?? label;
      }
      if (
        changes.customFilter!.fromValue &&
        namesEqual(value, changes.customFilter!.fromValue)
      ) {
        value = changes.customFilter!.toValue ?? value;
      }
      return { label, value };
    });
    if (
      filters.some(
        (f, i) =>
          f.label !== row.customFilters[i].label || f.value !== row.customFilters[i].value
      )
    ) {
      row = { ...row, customFilters: filters };
    }
  }
  return row;
}
