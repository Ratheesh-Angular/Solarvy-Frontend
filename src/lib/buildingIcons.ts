/**
 * Building-type icons from `assets/solarvy-icons/building_icons/`.
 * Convention: filename basename (no extension) must match the Excel
 * property type label (case-insensitive). Add a new PNG/SVG/WebP with
 * that name when Excel gains a new building type.
 */

const modules = import.meta.glob(
  "../assets/solarvy-icons/building_icons/*.{png,svg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const iconByLabel = new Map<string, string>();

for (const [path, src] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? path;
  const basename = file.replace(/\.(png|svg|webp)$/i, "");
  iconByLabel.set(basename.toLowerCase(), src);
}

/** Resolve a building-type label to its asset URL, if present. */
export function getBuildingIconSrc(label: string): string | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;
  return iconByLabel.get(key);
}
