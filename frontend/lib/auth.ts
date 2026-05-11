import type { RoleName } from "@/lib/api";

export type LoginMode = "user" | "admin";

export const privilegedRoles = new Set(["admin", "owner"]);

export function hasPrivilegedRole(roles: RoleName[]) {
  return roles.some((role) => privilegedRoles.has(role.toLowerCase()));
}

export function getDashboardPathForRoles(roles: RoleName[]) {
  return hasPrivilegedRole(roles) ? "/admin/dashboard" : "/user/dashboard";
}

export function isAllowedForLoginMode(roles: RoleName[], mode: LoginMode) {
  const isPrivileged = hasPrivilegedRole(roles);
  return mode === "admin" ? isPrivileged : !isPrivileged;
}
