import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const PREFIX = "scrypt";
const KEY_LEN = 64;

export function isHashedPassword(value: string): boolean {
  return value.startsWith(`${PREFIX}$`);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
  return `${PREFIX}$${salt}$${derived.toString("hex")}`;
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Verify a password against a scrypt hash or a legacy plaintext value. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false;
  if (!isHashedPassword(stored)) {
    return safeEqualString(plain, stored);
  }
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expectedHex = parts[2];
  const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
