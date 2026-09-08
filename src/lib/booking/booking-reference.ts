import { randomBytes } from "node:crypto";

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const REFERENCE_LENGTH = 8;

/** Short, unambiguous code for guest/host/support communication. */
export function createBookingReference(): string {
  const bytes = randomBytes(REFERENCE_LENGTH);
  let code = "";

  for (let index = 0; index < bytes.length; index += 1) {
    code += REFERENCE_ALPHABET[bytes[index] % REFERENCE_ALPHABET.length];
  }

  return `FS-${code}`;
}
