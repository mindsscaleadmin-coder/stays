const DEMO_INVITE_CODE = "GREENFIELD-ADMIN";

export function isValidAdminInviteCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;

  const configured = process.env.NEXT_PUBLIC_ADMIN_INVITE_CODE;
  if (configured) return trimmed === configured;

  return trimmed === DEMO_INVITE_CODE;
}
