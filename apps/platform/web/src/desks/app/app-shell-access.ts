export const standardDeskPath = "/app/neot/dashboard";

export function canAccessAdministratorSettings(role: string | undefined) {
  return role === "admin";
}

export function canSelectApplicationTheme(role: string | undefined) {
  return canAccessAdministratorSettings(role);
}

export function applicationEntryPath(role?: string) {
  if (role === "student" || role === "master") return "/app/neot/courses";
  return standardDeskPath;
}
