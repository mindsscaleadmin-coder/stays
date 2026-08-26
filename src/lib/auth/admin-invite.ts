const DEMO_INVITE_CODE = "GREENFIELD-ADMIN";

function configuredInviteCode(): string | undefined {
  return process.env.ADMIN_INVITE_CODE || process.env.NEXT_PUBLIC_ADMIN_INVITE_CODE;
}

export function isValidAdminInviteCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;

  const configured = configuredInviteCode();
  if (configured) return trimmed === configured;

  if (process.env.NODE_ENV === "production") return false;
  return trimmed === DEMO_INVITE_CODE;
}
