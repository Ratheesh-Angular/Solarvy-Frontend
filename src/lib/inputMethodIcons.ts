/**
 * Input-method icons from `assets/solarvy-icons/input_method/`.
 * Convention: filename basename (no extension) must match the card
 * title (case-insensitive). Add a new PNG/SVG/WebP with that name when
 * a new input method option is introduced.
 */

const modules = import.meta.glob(
  "../assets/solarvy-icons/input_method/*.{png,svg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const iconByLabel = new Map<string, string>();

for (const [path, src] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? path;
  const basename = file.replace(/\.(png|svg|webp)$/i, "");
  iconByLabel.set(basename.toLowerCase(), src);
}

/** Resolve an input-method title to its asset URL, if present. */
export function getInputMethodIconSrc(label: string): string | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;
  return iconByLabel.get(key);
}
