#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rootDist = join(root, "dist");

mkdirSync(rootDist, { recursive: true });

console.log(`Collected build output in ${rootDist}`);
