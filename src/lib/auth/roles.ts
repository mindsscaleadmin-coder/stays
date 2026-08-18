export type UserRole = "guest" | "host" | "admin";

export function hasRole(roles: string[], role: UserRole): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: string[], required: UserRole[]): boolean {
  return required.some((r) => roles.includes(r));
}

export function canBook(roles: string[]): boolean {
  return hasRole(roles, "guest");
}

export function canManageListings(roles: string[]): boolean {
  return hasRole(roles, "host");
}

export function canAccessAdmin(roles: string[]): boolean {
  return hasRole(roles, "admin");
}
