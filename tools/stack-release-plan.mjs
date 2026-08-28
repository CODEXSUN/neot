#!/usr/bin/env node

import { productStackContract } from "./product-stack-contract.mjs";

const name = process.argv[2];
const contract = productStackContract[name];
if (!contract) {
  console.error(`Usage: npm run stack:plan -- <${Object.keys(productStackContract).join("|")}>`);
  process.exit(1);
}

console.log(`Independent release plan: ${name}`);
console.log(`  release tag: ${contract.releaseTagPrefix}<major>.<minor>.<patch>`);
console.log(`  verify gate: npm run verify:${name}`);
console.log(`  unchanged dependencies: ${contract.foundationServices.join(", ")}`);
console.log(`  build/deploy unit: ${contract.productServices.join(", ")}`);
console.log(`  owned migration scopes: ${contract.ownedDatabaseScopes.join(", ") || "none"}`);
console.log("  rollout: build -> verify -> backup -> expand migration -> deploy inactive slot");
console.log(
  "           -> health/readiness gate -> switch traffic -> observe -> contract migration later"
);
console.log(
  "  rollback: switch traffic to the previous product release; do not roll back shared services"
);
