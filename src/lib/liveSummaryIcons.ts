/**
 * Live-summary icons from `assets/solarvy-icons/live summary/`.
 * Convention: filename basename (no extension) must match the lookup
 * label (case-insensitive). Add a new PNG/SVG/WebP with that name when
 * a new metric or assessment-path icon is introduced.
 */

const modules = import.meta.glob(
  "../assets/solarvy-icons/live summary/*.{png,svg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const iconByLabel = new Map<string, string>();

for (const [path, src] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? path;
  const basename = file.replace(/\.(png|svg|webp)$/i, "");
  iconByLabel.set(basename.toLowerCase(), src);
}

/** Resolve a live-summary icon label to its asset URL, if present. */
export function getLiveSummaryIconSrc(label: string): string | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;
  return iconByLabel.get(key);
}

const PATH_ICON_LABELS = {
  bill: "Monthly Bill",
  appliance: "Appliance Calculator",
  custom: "Custom Equipment",
} as const;

/** Resolve the Assessment Path card icon for the selected input method. */
export function getLiveSummaryPathIconSrc(
  method: "bill" | "appliance" | "custom",
): string | undefined {
  return getLiveSummaryIconSrc(PATH_ICON_LABELS[method]);
}
