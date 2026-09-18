import { prisma } from "@/lib/prisma";
import {
  DEFAULT_OPERATIONAL_SETTINGS,
  mergeOperationalSettings,
  sanitizeOperationalSettingsInput,
} from "@/lib/host/operational-settings-data";
import type {
  OperationalSettings,
  OperationalSettingsInput,
  OperationalTimezoneMeta,
} from "@/lib/host/operational-settings-types";
import { resolveTimezoneFromCountry } from "@/lib/host/operational-timezone";
import { getPlatformConfig } from "@/lib/server/platform-config-repo";
import { getHostProfile, saveHostProfile } from "@/lib/server/host-profile-repo";
import { defaultHostPublicProfile } from "@/lib/host/host-profile-data";

type HostProfilePayload = Record<string, unknown> & {
  operationalSettings?: OperationalSettingsInput;
};

async function readHostPayload(hostId: string): Promise<HostProfilePayload | null> {
  const row = await prisma.hostProfile.findUnique({ where: { hostId } });
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as HostProfilePayload;
  } catch {
    return null;
  }
}

async function platformOperationalDefaults(): Promise<OperationalSettings> {
  const config = await getPlatformConfig();
  return config.operational ?? DEFAULT_OPERATIONAL_SETTINGS;
}

async function resolveHostCountryTimezone(hostId: string): Promise<OperationalTimezoneMeta> {
  const listing = await prisma.listing.findFirst({
    where: { hostId },
    orderBy: { updatedAt: "desc" },
    select: {
      country: true,
      timezone: true,
      countryRef: { select: { name: true, iso2: true, timezone: true } },
    },
  });

  const countryName = listing?.countryRef?.name || listing?.country || null;
  const iso2 = listing?.countryRef?.iso2 ?? null;
  const timezone = resolveTimezoneFromCountry({
    countryName,
    iso2,
    dbTimezone: listing?.timezone || listing?.countryRef?.timezone,
  });

  return {
    timezone,
    countryName,
    iso2,
    derivedFromCountry: Boolean(countryName || iso2 || listing?.timezone),
  };
}

function withCountryTimezone(
  settings: OperationalSettings,
  timezoneMeta: OperationalTimezoneMeta
): OperationalSettings {
  return {
    ...settings,
    timezone: timezoneMeta.timezone,
  };
}

export async function getHostOperationalSettings(
  hostId: string
): Promise<OperationalSettings> {
  const defaults = await platformOperationalDefaults();
  const payload = await readHostPayload(hostId);
  const merged = mergeOperationalSettings(defaults, payload?.operationalSettings);
  const timezoneMeta = await resolveHostCountryTimezone(hostId);
  return withCountryTimezone(merged, timezoneMeta);
}

export async function getHostOperationalSettingsBundle(hostId: string): Promise<{
  settings: OperationalSettings;
  timezoneMeta: OperationalTimezoneMeta;
}> {
  const defaults = await platformOperationalDefaults();
  const payload = await readHostPayload(hostId);
  const merged = mergeOperationalSettings(defaults, payload?.operationalSettings);
  const timezoneMeta = await resolveHostCountryTimezone(hostId);
  return {
    settings: withCountryTimezone(merged, timezoneMeta),
    timezoneMeta,
  };
}

export async function saveHostOperationalSettings(
  hostId: string,
  input: OperationalSettingsInput
): Promise<OperationalSettings> {
  const defaults = await platformOperationalDefaults();
  const current = await getHostOperationalSettings(hostId);
  const next = sanitizeOperationalSettingsInput(input, current);

  const profile = await getHostProfile(hostId);
  if (!profile) {
    await saveHostProfile(hostId, defaultHostPublicProfile(hostId));
  }

  const existing = await prisma.hostProfile.findUnique({ where: { hostId } });
  const payload: HostProfilePayload = existing
    ? (JSON.parse(existing.payload) as HostProfilePayload)
    : {};

  await prisma.hostProfile.upsert({
    where: { hostId },
    create: {
      hostId,
      payload: JSON.stringify({
        ...payload,
        operationalSettings: next,
      }),
    },
    update: {
      payload: JSON.stringify({
        ...payload,
        operationalSettings: next,
      }),
    },
  });

  const timezoneMeta = await resolveHostCountryTimezone(hostId);
  return withCountryTimezone(mergeOperationalSettings(defaults, next), timezoneMeta);
}

/** Map of hostId → effective settings (for cron batching). */
export async function loadOperationalSettingsByHostIds(
  hostIds: string[]
): Promise<Map<string, OperationalSettings>> {
  const defaults = await platformOperationalDefaults();
  const unique = Array.from(new Set(hostIds.filter(Boolean)));
  const map = new Map<string, OperationalSettings>();

  if (unique.length === 0) return map;

  const rows = await prisma.hostProfile.findMany({
    where: { hostId: { in: unique } },
    select: { hostId: true, payload: true },
  });

  const listings = await prisma.listing.findMany({
    where: { hostId: { in: unique } },
    orderBy: { updatedAt: "desc" },
    select: {
      hostId: true,
      country: true,
      timezone: true,
      countryRef: { select: { name: true, iso2: true, timezone: true } },
    },
  });

  const listingByHost = new Map<string, (typeof listings)[number]>();
  for (const listing of listings) {
    if (!listingByHost.has(listing.hostId)) {
      listingByHost.set(listing.hostId, listing);
    }
  }

  const byHost = new Map(rows.map((row) => [row.hostId, row.payload]));

  for (const hostId of unique) {
    let override: OperationalSettingsInput | undefined;
    const raw = byHost.get(hostId);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as HostProfilePayload;
        override = parsed.operationalSettings;
      } catch {
        override = undefined;
      }
    }
    const listing = listingByHost.get(hostId);
    const countryName = listing?.countryRef?.name || listing?.country || null;
    const timezone = resolveTimezoneFromCountry({
      countryName,
      iso2: listing?.countryRef?.iso2 ?? null,
      dbTimezone: listing?.timezone || listing?.countryRef?.timezone,
    });
    map.set(
      hostId,
      withCountryTimezone(mergeOperationalSettings(defaults, override), {
        timezone,
        countryName,
        iso2: listing?.countryRef?.iso2 ?? null,
        derivedFromCountry: Boolean(countryName || listing?.countryRef?.iso2 || listing?.timezone),
      })
    );
  }

  return map;
}
