export interface GuestUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  /** Admin taxonomy country id — where the host belongs */
  country?: string;
  roles: string[];
  language: "en";
  /** Optional profile photo (data URL or remote URL) */
  avatarUrl?: string;
  /**
   * When logged in as host staff/manager, this is the owner host id whose
   * listings and data they manage.
   */
  staffHostId?: string;
  staffMemberId?: string;
  staffRole?: "owner" | "manager" | "staff";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
