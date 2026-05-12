import type { RoleName } from "@/lib/api";

export type LoginMode = "user" | "admin";

export const privilegedRoles = new Set(["admin", "owner"]);

export function hasOwnerRole(roles: RoleName[]) {
  return roles.some((role) => role.toLowerCase() === "owner");
}

export function hasAdminRole(roles: RoleName[]) {
  return roles.some((role) => role.toLowerCase() === "admin");
}

export function hasPrivilegedRole(roles: RoleName[]) {
  return roles.some((role) => privilegedRoles.has(role.toLowerCase()));
}

export function getDashboardPathForRoles(roles: RoleName[]) {
  if (hasOwnerRole(roles)) {
    return "/owner/reports";
  }

  return hasAdminRole(roles) ? "/admin/dashboard" : "/user/dashboard";
}

export function isAllowedForLoginMode(roles: RoleName[], mode: LoginMode) {
  const isPrivileged = hasPrivilegedRole(roles);
  return mode === "admin" ? isPrivileged : !isPrivileged;
}
