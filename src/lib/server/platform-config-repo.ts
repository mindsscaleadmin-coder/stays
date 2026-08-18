import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PLATFORM_CONFIG,
  mergePlatformConfig,
  sanitizePlatformConfig,
} from "@/lib/admin/platform-config-data";
import type { PlatformConfig } from "@/lib/admin/platform-config-types";

const SETTINGS_ID = "default";

function parsePayload(raw: string): Partial<PlatformConfig> {
  return JSON.parse(raw) as Partial<PlatformConfig>;
}

export async function getPlatformConfig(sanitize = true): Promise<PlatformConfig> {
  const row = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_PLATFORM_CONFIG;
  const merged = mergePlatformConfig(parsePayload(row.payload));
  return sanitize ? sanitizePlatformConfig(merged) : merged;
}

export async function getPlatformConfigAdmin(): Promise<PlatformConfig> {
  const row = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return DEFAULT_PLATFORM_CONFIG;
  return mergePlatformConfig(parsePayload(row.payload));
}

export async function savePlatformConfig(config: PlatformConfig): Promise<PlatformConfig> {
  const next: PlatformConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, payload: JSON.stringify(next) },
    update: { payload: JSON.stringify(next) },
  });
  return next;
}
