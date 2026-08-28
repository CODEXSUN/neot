#!/usr/bin/env node

import { rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDist = resolve(import.meta.dirname, "..", "dist");

rmSync(rootDist, { force: true, recursive: true });

console.log(`Cleaned root build output at ${rootDist}`);
