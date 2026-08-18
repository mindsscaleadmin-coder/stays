export type ExtraChargeBilling =
  | "per_night"
  | "per_day"
  | "per_stay"
  | "per_person"
  | "per_person_per_night";

/** Admin-defined extra charge templates hosts can attach to a listing. */
export interface ExtraChargeCatalogItem {
  id: string;
  label: string;
  defaultAmount: number;
  defaultBilling: ExtraChargeBilling;
  enabled: boolean;
}

export type ExtraChargeCatalogItemInput = Omit<ExtraChargeCatalogItem, "id">;

export const EXTRA_CHARGE_BILLING_LABELS: Record<ExtraChargeBilling, string> = {
  per_night: "Per night",
  per_day: "Per day",
  per_stay: "Per stay",
  per_person: "Per person",
  per_person_per_night: "Per person / night",
};
