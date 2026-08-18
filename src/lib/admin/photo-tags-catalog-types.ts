/** Admin-managed photo name/tag options shown in the listing photo manager. */
export interface PhotoTagCatalogItem {
  id: string;
  /** Stable slug stored when hosts pick a chip (also used for lookups). */
  value: string;
  label: string;
  enabled: boolean;
}

export type PhotoTagCatalogItemInput = Omit<PhotoTagCatalogItem, "id">;
