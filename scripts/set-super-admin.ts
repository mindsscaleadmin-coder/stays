/**
 * Point the primary Super Admin login at your real email + password.
 *
 * 1. Set in .env:
 *      SUPER_ADMIN_EMAIL="you@gmail.com"
 *      SUPER_ADMIN_PASSWORD="your-secure-password"
 *      SUPER_ADMIN_NAME="Your Name"   # optional
 * 2. Run:
 *      npx tsx scripts/set-super-admin.ts
 *
 * This updates STF-001 in PlatformStaff. The old seed email (admin@greenfield.ae)
 * is deactivated when you switch to a different address.
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { DEFAULT_PERMISSIONS } from "../src/lib/admin/staff-types";
import { SEED_STAFF } from "../src/lib/admin/staff-data";

const LEGACY_SUPER_ADMIN_EMAIL = "admin@greenfield.ae";
const SUPER_ADMIN_ID = "STF-001";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it to .env and run again.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const email = requireEnv("SUPER_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("SUPER_ADMIN_PASSWORD");
  const name = process.env.SUPER_ADMIN_NAME?.trim() || email.split("@")[0] || "Super Admin";

  if (password.length < 4) {
    console.error("SUPER_ADMIN_PASSWORD must be at least 4 characters.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.warn("Warning: password is shorter than 8 characters — use only for temporary local testing.");
  }

  const hashed = await hashPassword(password);
  const seed = SEED_STAFF.find((s) => s.id === SUPER_ADMIN_ID) ?? SEED_STAFF[0];

  const existingByEmail = await prisma.platformStaff.findUnique({ where: { email } });
  if (existingByEmail && existingByEmail.id !== SUPER_ADMIN_ID) {
    console.error(
      `Another staff account already uses ${email}. Remove or edit it in Admin → Users → Staff access first.`
    );
    process.exit(1);
  }

  await prisma.platformStaff.upsert({
    where: { id: SUPER_ADMIN_ID },
    create: {
      id: SUPER_ADMIN_ID,
      name,
      email,
      role: "admin",
      permissions: JSON.stringify([...DEFAULT_PERMISSIONS.admin]),
      active: true,
      password: hashed,
      createdAt: new Date(seed.createdAt),
    },
    update: {
      name,
      email,
      role: "admin",
      permissions: JSON.stringify([...DEFAULT_PERMISSIONS.admin]),
      active: true,
      password: hashed,
    },
  });

  if (email !== LEGACY_SUPER_ADMIN_EMAIL) {
    await prisma.platformStaff.updateMany({
      where: {
        email: LEGACY_SUPER_ADMIN_EMAIL,
        id: { not: SUPER_ADMIN_ID },
      },
      data: { active: false },
    });
  }

  console.log("Super Admin login updated.");
  console.log(`  Email:    ${email}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Sign in:  /admin/login`);
  if (email !== LEGACY_SUPER_ADMIN_EMAIL) {
    console.log(`  Note:     ${LEGACY_SUPER_ADMIN_EMAIL} is no longer the primary Super Admin.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
