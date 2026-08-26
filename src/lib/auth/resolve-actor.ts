import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export type SessionActor = {
  id: string;
  email: string | null;
  roles: string[];
  staffHostId?: string;
};

export const DEMO_ACTOR: SessionActor = {
  id: "demo",
  email: null,
  roles: ["guest", "host", "admin"],
};

function parseRoles(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Roles the server will honor from the client JWT.
 * `admin` is never taken from user_metadata — anyone can set that at signup.
 */
function trustedMetadataRoles(user: User): string[] {
  const raw = user.user_metadata?.roles;
  if (!Array.isArray(raw)) return ["guest"];
  return raw.filter((role): role is "guest" | "host" => role === "guest" || role === "host");
}

/** Resolve who this session may act as. Admin/staff come from Postgres, not JWT claims. */
export async function resolveSessionActor(user: User): Promise<SessionActor> {
  const email = user.email?.trim().toLowerCase() || null;
  const roles = new Set<string>([
    ...trustedMetadataRoles(user),
    ...parseRoles(
      (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { roles: true },
        })
      )?.roles
    ).filter((role) => role !== "admin"),
  ]);

  let staffHostId: string | undefined;
  if (email) {
    const [platform, hostStaff] = await Promise.all([
      prisma.platformStaff.findFirst({
        where: { email, active: true },
        select: { id: true },
      }),
      prisma.hostStaff.findFirst({
        where: { email, active: true },
        select: { hostId: true },
      }),
    ]);
    if (platform) roles.add("admin");
    if (hostStaff) {
      roles.add("host");
      staffHostId = hostStaff.hostId;
    }
  }

  if (roles.size === 0) roles.add("guest");
  return { id: user.id, email, roles: Array.from(roles), staffHostId };
}
