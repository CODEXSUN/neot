#!/usr/bin/env node

import { affectedProductStacks, productStackContract } from "./product-stack-contract.mjs";

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: npm run stack:impact -- <changed-file> [changed-file ...]");
  process.exit(1);
}

const affected = affectedProductStacks(paths);
if (affected.length === 0) {
  console.log("No product stack verification required for the supplied paths.");
  process.exit(0);
}

console.log("Affected product stacks:");
for (const name of affected) {
  const contract = productStackContract[name];
  console.log(`  - ${name}: verify:${name}`);
  console.log(`    release unit: ${contract.productServices.join(", ")}`);
}
