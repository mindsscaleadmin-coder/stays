export interface ListingTagItem {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ListingTagsCatalog {
  farmTypes: ListingTagItem[];
  activities: ListingTagItem[];
  amenities: ListingTagItem[];
}

export interface ListingTagInput {
  label: string;
  enabled?: boolean;
}

export type ListingTagGroup = keyof ListingTagsCatalog;
