export const NEOT_PACKAGE_VERSION = "1.0.22";

export const neotStackContribution = Object.freeze({
  applicationMode: "client" as const,
  capabilities: Object.freeze({
    api: true,
    database: true,
    web: true
  }),
  compatibility: Object.freeze({
    cxapp: "^1.0.2"
  }),
  contractVersion: 1,
  dependencies: Object.freeze([] as string[]),
  description: "Developer and engineering orchestration workspace.",
  displayName: "NEOT",
  id: "neot",
  packageId: "@neot/neot",
  registrationOrder: Object.freeze(["database", "api", "web"] as const),
  requiredEnvironment: Object.freeze([] as string[]),
  version: NEOT_PACKAGE_VERSION
});
