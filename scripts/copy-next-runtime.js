#!/usr/bin/env node
/**
 * After `next build` with output: 'standalone', Next.js does NOT copy
 * .next/static/ and public/ into the standalone tree. The standalone server
 * needs them adjacent to its server.js. This script does it.
 *
 * Run as part of electron:dist (electron-builder packages standalone).
 */
const { copyFileSync, cpSync, existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const standaloneNext = join(standalone, ".next");
const standalonePublic = join(standalone, "public");

if (!existsSync(standalone)) {
  console.error(
    "✗ .next/standalone not found. Run `next build` (with output:'standalone') first.",
  );
  process.exit(1);
}

mkdirSync(standaloneNext, { recursive: true });

// .next/static → standalone/.next/static
const staticSrc = join(root, ".next", "static");
const staticDst = join(standaloneNext, "static");
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDst, { recursive: true });
  console.log(`✓ copied .next/static → ${staticDst}`);
}

// public → standalone/public
const publicSrc = join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, standalonePublic, { recursive: true });
  console.log(`✓ copied public → ${standalonePublic}`);
}

console.log("✓ next runtime copy complete");
