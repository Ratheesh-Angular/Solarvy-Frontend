/**
 * Automated tests for Nigeria state matching (shared with nigeriaGeoMatching.ts).
 * Run: npm run test:geo
 */
import { build } from "esbuild";
import { unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(__dirname, ".geo-match-bundle.mjs");
const entryPath = join(__dirname, ".geo-match-entry.ts");

writeFileSync(
  entryPath,
  `
export {
  matchNigeriaState,
  labelFromNigeriaIsoSubdivision,
} from "../src/lib/nigeriaGeoMatching.ts";
export { NIGERIA_STATE_LABELS } from "../src/lib/nigeriaStates.ts";
`,
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

const { matchNigeriaState, NIGERIA_STATE_LABELS } = await import(
  `${pathToFileURL(bundlePath).href}?t=${Date.now()}`,
);

const cases = [
  { region: "Lagos State", expected: "Lagos" },
  { region: "Lagos", expected: "Lagos" },
  { region: "LA", expected: "Lagos" },
  { region: "NG-LA", expected: "Lagos" },
  { region: "Federal Capital Territory", expected: "Federal Capital Territory" },
  { region: "Abuja", expected: "Federal Capital Territory" },
  { region: "Rivers", expected: "Rivers" },
  { region: "", expected: null },
  { region: "Shomolu", expected: null },
];

let passed = 0;
let failed = 0;

console.log("Nigeria state matching tests\n");
for (const { region, expected } of cases) {
  const actual = matchNigeriaState(region, NIGERIA_STATE_LABELS);
  const ok =
    expected === null ? actual === null : actual === expected;
  const status = ok ? "PASS" : "FAIL";
  if (ok) passed += 1;
  else failed += 1;
  console.log(
    `${status}  region=${JSON.stringify(region)} → expected=${JSON.stringify(expected)} got=${JSON.stringify(actual)}`,
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