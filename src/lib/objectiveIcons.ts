/**
 * Main-objective icons from `assets/solarvy-icons/Main Objective/`.
 * Convention: filename basename (no extension) must match the Excel
 * objective label (case-insensitive). Add a new PNG/SVG/WebP with
 * that name when Excel gains a new objective option.
 */

const modules = import.meta.glob(
  "../assets/solarvy-icons/Main Objective/*.{png,svg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const iconByLabel = new Map<string, string>();

for (const [path, src] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? path;
  const basename = file.replace(/\.(png|svg|webp)$/i, "");
  iconByLabel.set(basename.toLowerCase(), src);
}

/** Resolve a main-objective label to its asset URL, if present. */
export function getObjectiveIconSrc(label: string): string | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;
  return iconByLabel.get(key);
}
