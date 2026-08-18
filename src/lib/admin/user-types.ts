export type UserAccountStatus = "verified" | "pending" | "suspended" | "banned";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** Taxonomy country id where the host belongs */
  country?: string;
  roles: string[];
  status: UserAccountStatus;
  joinedAt: string;
  /** Optional admin notes / override metadata */
  adminNote?: string;
}

export type AdminUserProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  roles?: string[];
  adminNote?: string;
};
