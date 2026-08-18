import { clampCommissionPct } from "@/lib/admin/platform-config-data";
import type {
  AdminPayoutState,
  FinancialSettings,
  HostCommissionOverride,
  RefundRequest,
} from "@/lib/admin/financial-types";
import {
  getFinancialSettingsFromDb,
  saveFinancialSettingsToDb,
} from "@/lib/server/platform-catalog-repo";

export async function loadFinancialSettingsFromDb(): Promise<FinancialSettings> {
  return getFinancialSettingsFromDb();
}

export async function saveFullFinancialSettings(
  settings: FinancialSettings
): Promise<FinancialSettings> {
  return saveFinancialSettingsToDb(settings);
}

export async function updatePayoutStateInDb(
  payoutId: string,
  state: AdminPayoutState
): Promise<FinancialSettings> {
  const settings = await getFinancialSettingsFromDb();
  const next: FinancialSettings = {
    ...settings,
    payoutStates: {
      ...settings.payoutStates,
      [payoutId]: { ...state, reviewedAt: new Date().toISOString() },
    },
  };
  return saveFinancialSettingsToDb(next);
}

export async function updateCommissionSettingsInDb(
  updates: Partial<FinancialSettings["commission"]>
): Promise<FinancialSettings> {
  const settings = await getFinancialSettingsFromDb();
  const nextCommission = { ...settings.commission, ...updates };
  if (updates.globalFeePct !== undefined) {
    nextCommission.globalFeePct = clampCommissionPct(updates.globalFeePct);
  }
  if (updates.hostOverrides) {
    nextCommission.hostOverrides = updates.hostOverrides.map((o) => ({
      ...o,
      feePct: clampCommissionPct(o.feePct),
    }));
  }
  return saveFinancialSettingsToDb({
    ...settings,
    commission: nextCommission,
  });
}

export async function upsertHostCommissionOverrideInDb(
  override: HostCommissionOverride
): Promise<FinancialSettings> {
  const settings = await getFinancialSettingsFromDb();
  const clamped = { ...override, feePct: clampCommissionPct(override.feePct) };
  const existing = settings.commission.hostOverrides.filter(
    (o) => o.hostId !== clamped.hostId
  );
  return saveFinancialSettingsToDb({
    ...settings,
    commission: {
      ...settings.commission,
      hostOverrides: [...existing, clamped],
    },
  });
}

export async function removeHostCommissionOverrideInDb(
  hostId: string
): Promise<FinancialSettings> {
  const settings = await getFinancialSettingsFromDb();
  return saveFinancialSettingsToDb({
    ...settings,
    commission: {
      ...settings.commission,
      hostOverrides: settings.commission.hostOverrides.filter((o) => o.hostId !== hostId),
    },
  });
}

export async function reviewRefundRequestInDb(
  id: string,
  input: { status: RefundRequest["status"]; reviewNote?: string }
): Promise<FinancialSettings> {
  const settings = await getFinancialSettingsFromDb();
  return saveFinancialSettingsToDb({
    ...settings,
    refundRequests: settings.refundRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: input.status,
            reviewNote: input.reviewNote?.trim() || undefined,
            reviewedAt: new Date().toISOString(),
          }
        : r
    ),
  });
}
