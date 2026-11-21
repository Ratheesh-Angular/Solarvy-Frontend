/**
 * Tests for resolveAssessmentStateFromStored (draft hydrate / save symmetry).
 * Run: npm run test:assessment-hydrate
 */
import { build } from "esbuild";
import { unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(__dirname, ".assessment-hydrate-bundle.mjs");
const entryPath = join(__dirname, ".assessment-hydrate-entry.ts");

writeFileSync(
  entryPath,
  `export { resolveAssessmentStateFromStored } from "../src/lib/assessmentFormHelpers.ts";`,
);

const buildResult = await build({
  entryPoints: [entryPath],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundlePath,
});
if (buildResult.errors?.length) {
  console.error(buildResult.errors);
  process.exit(1);
}

const { resolveAssessmentStateFromStored } = await import(
  `${pathToFileURL(bundlePath).href}?t=${Date.now()}`
);

const cases = [
  { state: "Lagos", city: "", expected: "Lagos" },
  { state: "", city: "Lagos", expected: "Lagos" },
  { state: "Rivers", city: "Delta", expected: "Rivers" },
  { state: "", city: "", expected: "" },
];

let passed = 0;
let failed = 0;

console.log("Assessment state hydration tests\n");
for (const { state, city, expected } of cases) {
  const actual = resolveAssessmentStateFromStored({ state, city });
  const ok = actual === expected;
  const status = ok ? "PASS" : "FAIL";
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${status}  state=${JSON.stringify(state)} city=${JSON.stringify(city)} → expected=${JSON.stringify(expected)} got=${JSON.stringify(actual)}`,
  );
}

try {
  unlinkSync(bundlePath);
  unlinkSync(entryPath);
} catch {
  // ignore cleanup
}

console.log(`\nTotal: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);