import { NIGERIA_STATES } from "./nigeriaStates";

/** ISO 3166-2:NG subdivision code (without NG- prefix) → official state label. */
export const NIGERIA_ISO_SUBDIVISION_TO_LABEL: Record<string, string> = {
  AB: NIGERIA_STATES.abia,
  AD: NIGERIA_STATES.adamawa,
  AK: NIGERIA_STATES.akwa_ibom,
  AN: NIGERIA_STATES.anambra,
  BA: NIGERIA_STATES.bauchi,
  BY: NIGERIA_STATES.bayelsa,
  BE: NIGERIA_STATES.benue,
  BO: NIGERIA_STATES.borno,
  CR: NIGERIA_STATES.cross_river,
  DE: NIGERIA_STATES.delta,
  EB: NIGERIA_STATES.ebonyi,
  ED: NIGERIA_STATES.edo,
  EK: NIGERIA_STATES.ekiti,
  EN: NIGERIA_STATES.enugu,
  FC: NIGERIA_STATES.fct,
  GO: NIGERIA_STATES.gombe,
  IM: NIGERIA_STATES.imo,
  JI: NIGERIA_STATES.jigawa,
  KD: NIGERIA_STATES.kaduna,
  KN: NIGERIA_STATES.kano,
  KT: NIGERIA_STATES.katsina,
  KE: NIGERIA_STATES.kebbi,
  KO: NIGERIA_STATES.kogi,
  KW: NIGERIA_STATES.kwara,
  LA: NIGERIA_STATES.lagos,
  NA: NIGERIA_STATES.nasarawa,
  NI: NIGERIA_STATES.niger,
  OG: NIGERIA_STATES.ogun,
  ON: NIGERIA_STATES.ondo,
  OS: NIGERIA_STATES.osun,
  OY: NIGERIA_STATES.oyo,
  PL: NIGERIA_STATES.plateau,
  RI: NIGERIA_STATES.rivers,
  SO: NIGERIA_STATES.sokoto,
  TA: NIGERIA_STATES.taraba,
  YO: NIGERIA_STATES.yobe,
  ZA: NIGERIA_STATES.zamfara,
};

export function labelFromNigeriaIsoSubdivision(code: string): string | null {
  const raw = String(code || "").trim().toUpperCase();
  if (!raw) return null;
  const sub = raw.startsWith("NG-") ? raw.slice(3) : raw;
  return NIGERIA_ISO_SUBDIVISION_TO_LABEL[sub] ?? null;
}

function normalizeStateName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bstate\b/g, "")
    .replace(/[^a-z]/g, "");
}

const FCT_ALIASES = new Set([
  "fct",
  "abuja",
  "fctabuja",
  "federalcapitalterritory",
  "federalcapitalterritoryfct",
  "federalcapitalterritoryabuja",
]);

/** Match reverse-geocoded region or ISO code against Nigeria state labels. */
export function matchNigeriaState(
  region: string,
  stateOptions: string[],
): string | null {
  const trimmed = String(region || "").trim();
  if (!trimmed) return null;

  const fromIso = labelFromNigeriaIsoSubdivision(trimmed);
  if (fromIso) {
    if (stateOptions.includes(fromIso)) return fromIso;
    for (const option of stateOptions) {
      if (normalizeStateName(option) === normalizeStateName(fromIso)) {
        return option;
      }
    }
  }

  const needle = normalizeStateName(trimmed);
  if (!needle) return null;

  if (FCT_ALIASES.has(needle)) {
    const fct = stateOptions.find((option) =>
      FCT_ALIASES.has(normalizeStateName(option)),
    );
    if (fct) return fct;
  }

  for (const option of stateOptions) {
    if (normalizeStateName(option) === needle) return option;
  }

  for (const option of stateOptions) {
    const hay = normalizeStateName(option);
    if (hay.includes(needle) || needle.includes(hay)) return option;
  }

  return null;
}