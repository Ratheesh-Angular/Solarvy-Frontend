function parseEnvFlag(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return undefined;
}

/**
 * Customer profile page. Enabled in dev; off in production until
 * VITE_ENABLE_PROFILE_PAGE=true is set at build time.
 */
export const ENABLE_PROFILE_PAGE =
  parseEnvFlag(import.meta.env.VITE_ENABLE_PROFILE_PAGE) ??
  !import.meta.env.PROD;

/**
 * Customer projects workspace. Enabled in dev; off in production until
 * VITE_ENABLE_PROJECTS_PAGE=true is set at build time.
 */
export const ENABLE_PROJECTS_PAGE =
  parseEnvFlag(import.meta.env.VITE_ENABLE_PROJECTS_PAGE) ??
  !import.meta.env.PROD;