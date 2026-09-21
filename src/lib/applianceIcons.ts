/**
 * Appliance / equipment icons from `assets/solarvy-icons/Appliance Icons/`.
 * Convention: filename basename (no extension) should match the Excel
 * Equipment Default label when possible. Matching is case-insensitive;
 * spacing/punctuation differences use a normalized alphanumeric key.
 * Category rules map families of Appliance_Library / template names onto
 * one shared icon (e.g. all fans → Fan.png). Add a new PNG/SVG/WebP when
 * Excel gains a truly new equipment category.
 */

const modules = import.meta.glob(
  "../assets/solarvy-icons/Appliance Icons/*.{png,svg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const iconByLabel = new Map<string, string>();
const iconByNormalized = new Map<string, string>();

function normalizeKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

for (const [path, src] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? path;
  const basename = file.replace(/\.(png|svg|webp)$/i, "");
  iconByLabel.set(basename.toLowerCase(), src);
  const normalized = normalizeKey(basename);
  if (normalized) iconByNormalized.set(normalized, src);
}

/**
 * Ordered category aliases → normalized icon basename.
 * First matching regex wins; keep more-specific patterns above broader ones.
 */
const CATEGORY_RULES: Array<[RegExp, string]> = [
  // Refrigeration (specific → general)
  [/lab\s*refrigerator|labaratory/i, "labaratoryrefrigerator"],
  [/medicine|vaccine|medical\s*refrigerator/i, "medicalrefrigerator"],
  [/display\s*fridge/i, "displayfridge"],
  [/deep\s*freezer|chest\s*freezer|kitchen\s*freezer/i, "deepfreezer"],
  [/beverage\s*cooler/i, "drink"],
  [/fridge|refrigerator|refrigeration/i, "refrigerator"],

  // Security / network (CCTV before generic router/wifi)
  [/cctv/i, "cctvsystem"],

  // Fans before gatehouse / exhaust-pipe
  [/\bfans?\b|ventilation\s*fan|evaporator\s*fan|exhaust\s*fan/i, "fan"],

  // Displays / media
  [/television|\btvs?\b|projector|screens?|decoder/i, "tv"],
  [/sound\s*bar|sound\s*system/i, "soundbar"],

  // Cooling / HVAC
  [/\bac\b|a\/c|air\s*cond/i, "ac1hp"],

  // Lighting (after AC so "Selected AC" is not treated as light)
  [/light|lights|led|signage/i, "led"],

  // Pumps (after fan/motor-ish; "Pump Control" handled by small motor below)
  [/pump\s*control/i, "smallmotor"],
  [/pump|borehole|booster|irrigation/i, "waterpump"],

  // Laundry
  [/washing|laundry/i, "washingmachine"],

  // Kitchen appliances
  [/microwave|oven|proofing/i, "oven"],
  [/blender/i, "blender"],
  [/\bmixer\b/i, "mixer"],
  [/ice\s*maker/i, "icemaker"],
  [/small\s*kitchen\s*appliance/i, "smallappliance"],
  [/kitchen\s*equipment|\bkitchen\b/i, "kitchen"],

  // Salon / tools
  [/clipper/i, "hairclipper"],
  [/hair\s*dry/i, "hairdryer"],

  // Commercial / industrial
  [/\batm\b/i, "atmmachine"],
  [/compressor/i, "compressor"],
  [/small\s*motors?|roller\s*door|motor\s*allowance/i, "smallmotor"],
  [/grinder/i, "anglegrinder"],
  [/welding/i, "welding"],
  [/milling|\bcnc\b/i, "cncmachine"],

  // Office / ICT (printer before generic computer so Computers/Printer → printer)
  [/printer|photocopier|laminator|sealer|digital\s*printer/i, "printer"],
  [/\blaptops?\b/i, "laptop"],
  [/desktop|computers?|\bpcs?\b|\bpos\b|\bict\b/i, "computerpos"],
  [/phone|charger|smartphone/i, "smartphone"],
  [/server|ups/i, "cloudnetwork"],
  [/router|wifi|network/i, "router"],

  // Spaces / generic loads
  [/office|reception|admin|controls?|control\s*panel/i, "office"],
  [/workshop|feed\s*equipment/i, "workshop"],
  [/dining/i, "diningtable"],
  [/gatehouse/i, "gate"],

  // Medical / lab specialty → shared ultrasound asset
  [
    /sterilizer|centrifuge|microscope|dental|patient\s*monitor|delivery\s*room|diagnostic|lab\s*equipment|ultrasound/i,
    "ultrasoundmachine",
  ],

  // Last-resort for remaining allowances / packaging
  [/packaging|allowance/i, "warning"],
];

function resolveViaCategory(label: string): string | undefined {
  for (const [pattern, targetNorm] of CATEGORY_RULES) {
    if (pattern.test(label)) {
      const src = iconByNormalized.get(targetNorm);
      if (src) return src;
    }
  }
  return undefined;
}

function resolveLoose(normalized: string): string | undefined {
  let best: { len: number; src: string } | null = null;
  for (const [fileNorm, src] of iconByNormalized) {
    if (fileNorm.length < 2) continue;
    if (normalized.includes(fileNorm) || fileNorm.includes(normalized)) {
      if (!best || fileNorm.length > best.len) {
        best = { len: fileNorm.length, src };
      }
    }
  }
  return best?.src;
}

/** Resolve an equipment label to its asset URL, if present. */
export function getApplianceIconSrc(label: string): string | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;

  const exact = iconByLabel.get(key);
  if (exact) return exact;

  const normalized = normalizeKey(label);
  if (!normalized) return undefined;

  const byNorm = iconByNormalized.get(normalized);
  if (byNorm) return byNorm;

  const category = resolveViaCategory(label);
  if (category) return category;

  return resolveLoose(normalized);
}
