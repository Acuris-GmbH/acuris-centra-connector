// Tiny CJS shim so consumers on classic Node (require) can use the SDK.
// Pure ESM is published as dist/index.js; this file emits dist/index.cjs that
// re-exports from the ESM build via dynamic import.
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "dist", "index.cjs");

const cjs = `// Auto-generated CJS bridge. Prefer the ESM entry where possible.
"use strict";
module.exports = (async () => {
  const esm = await import("./index.js");
  return esm;
})();
// For environments that don't support top-level await on require(), use
// the named-export form:
//   const { AcurisClient } = await require("@acuris-geo/av-sdk");
`;

writeFileSync(out, cjs, "utf8");
console.log("wrote", out);
