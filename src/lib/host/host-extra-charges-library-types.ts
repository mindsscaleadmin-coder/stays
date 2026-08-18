import type { ExtraChargeBilling } from "@/lib/admin/extra-charges-catalog-types";

/** Host-owned reusable extra charge (not listing-specific). */
export interface HostExtraChargeTemplate {
  id: string;
  label: string;
  amount: number;
  billing: ExtraChargeBilling;
}
