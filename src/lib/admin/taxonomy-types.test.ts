import { describe, expect, it } from "vitest";
import {
  mergeApiTaxonomyWithLocal,
  mergeTaxonomySources,
  normalizeTaxonomy,
  SEED_TAXONOMY,
} from "./taxonomy-data";
import { isSubcategoryExtensionTab, mergeMainTabs } from "./taxonomy-types";

describe("mergeMainTabs", () => {
  it("drops junior sub category extension tabs from the filter panel", () => {
    const merged = mergeMainTabs([
      { id: "subcategory", label: "Sub Category", builtIn: true },
      { id: "roomType", label: "Room Types" },
      { id: "tab-junior", label: "Junior sub category", builtIn: false },
    ]);

    expect(isSubcategoryExtensionTab({ id: "tab-junior", label: "Junior sub category" })).toBe(
      true
    );
    expect(merged.some((tab) => tab.id === "tab-junior")).toBe(false);
    expect(merged.some((tab) => tab.id === "subcategory")).toBe(true);
  });

  it("drops hyphenated junior sub-category tabs", () => {
    const merged = mergeMainTabs([
      ...SEED_TAXONOMY.mainTabs,
      { id: "tab-junior", label: "Junior Sub-Category", builtIn: false },
    ]);

    expect(merged.some((tab) => tab.id === "tab-junior")).toBe(false);
  });
});

describe("mergeTaxonomySources", () => {
  it("does not restore junior sub category tabs from in-memory taxonomy", () => {
    const api = SEED_TAXONOMY;
    const inMemory = mergeTaxonomySources(api, {
      ...api,
      mainTabs: [
        ...api.mainTabs,
        { id: "tab-junior", label: "Junior sub category", builtIn: false },
      ],
      customItems: { ...api.customItems, "tab-junior": [] },
    });

    const merged = mergeTaxonomySources(api, api, inMemory);

    expect(merged.mainTabs.some((tab) => tab.id === "tab-junior")).toBe(false);
  });
});

describe("mergeApiTaxonomyWithLocal", () => {
  it("does not merge junior sub category tabs from local storage", () => {
    const api = SEED_TAXONOMY;
    const local = mergeApiTaxonomyWithLocal(api, {
      ...api,
      mainTabs: [
        ...api.mainTabs,
        { id: "tab-junior", label: "Junior sub category", builtIn: false },
      ],
      customItems: { ...api.customItems, "tab-junior": [] },
    });

    const merged = mergeApiTaxonomyWithLocal(api, local);

    expect(merged.mainTabs.some((tab) => tab.id === "tab-junior")).toBe(false);
  });
});

describe("normalizeTaxonomy", () => {
  it("removes junior sub category custom items on load", () => {
    const normalized = normalizeTaxonomy({
      ...SEED_TAXONOMY,
      mainTabs: [
        ...SEED_TAXONOMY.mainTabs,
        { id: "tab-junior", label: "Junior sub category", builtIn: false },
      ],
      customItems: {
        ...SEED_TAXONOMY.customItems,
        "tab-junior": [{ id: "junior-1", name: "Junior option" }],
      },
    });

    expect(normalized.mainTabs.some((tab) => tab.id === "tab-junior")).toBe(false);
    expect(normalized.customItems["tab-junior"]).toBeUndefined();
  });
});
