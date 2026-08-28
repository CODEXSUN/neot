const publicExports = [
  "@neot/framework",
  "@neot/framework/api",
  "@neot/framework/config",
  "@neot/framework/db",
  "@neot/framework/env",
  "@neot/framework/errors",
  "@neot/framework/events",
  "@neot/framework/health",
  "@neot/framework/http",
  "@neot/framework/logger",
  "@neot/framework/modules",
  "@neot/framework/queue",
  "@neot/framework/storage"
];

for (const publicExport of publicExports) {
  await import(publicExport);
}

console.info(`Framework export check passed for ${publicExports.length} public entry points.`);
