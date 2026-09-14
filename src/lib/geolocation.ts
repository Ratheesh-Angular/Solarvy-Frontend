const GEO_CACHE_KEY = "solarvy_geo_location";
const GEO_DENIED_KEY = "solarvy_geo_denied";

export type DetectedLocation = {
  city: string;
  state: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

function normalizeStateName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bstate\b/g, "")
    .replace(/[^a-z]/g, "");
}

/** Match reverse-geocoded region against Nigeria state labels. */
export function matchNigeriaState(
  region: string,
  stateOptions: string[],
): string | null {
  const needle = normalizeStateName(region);
  if (!needle) return null;

  for (const option of stateOptions) {
    if (normalizeStateName(option) === needle) return option;
  }

  for (const option of stateOptions) {
    const hay = normalizeStateName(option);
    if (hay.includes(needle) || needle.includes(hay)) return option;
  }

  return null;
}

function readCache(): DetectedLocation | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DetectedLocation;
    if (parsed?.latitude != null && parsed?.longitude != null) return parsed;
  } catch {
    // ignore
  }
  return null;
}

function writeCache(value: DetectedLocation) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readDenied(): boolean {
  try {
    return sessionStorage.getItem(GEO_DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDenied() {
  try {
    sessionStorage.setItem(GEO_DENIED_KEY, "1");
  } catch {
    // ignore
  }
}

function clearDenied() {
  try {
    sessionStorage.removeItem(GEO_DENIED_KEY);
  } catch {
    // ignore
  }
}

async function getGeolocationPermissionState(): Promise<PermissionState | null> {
  try {
    if (!navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 15 * 60 * 1000,
    });
  });
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<DetectedLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocode failed");
  }

  const data = (await response.json()) as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
      state?: string;
      region?: string;
      country?: string;
      country_code?: string;
    };
  };

  const address = data.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";
  const state = address.state || address.region || "";
  const country = address.country || "";
  const countryCode = (address.country_code || "").toUpperCase();

  return {
    city,
    state,
    country,
    countryCode,
    latitude,
    longitude,
  };
}

let detectPromise: Promise<DetectedLocation | null> | null = null;

async function detectUserLocationOnce(): Promise<DetectedLocation | null> {
  const cached = readCache();
  if (cached) return cached;

  const permissionState = await getGeolocationPermissionState();
  if (permissionState === "denied") {
    writeDenied();
    return null;
  }

  if (readDenied()) {
    if (permissionState === "granted" || permissionState === "prompt") {
      clearDenied();
    } else {
      return null;
    }
  }

  try {
    const position = await getCurrentPosition();
    console.log("[geolocation] coordinates", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    });

    const location = await reverseGeocode(
      position.coords.latitude,
      position.coords.longitude,
    );
    console.log("[geolocation] reverse geocoded location", location);

    clearDenied();
    writeCache(location);
    return location;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as GeolocationPositionError).code === 1
    ) {
      writeDenied();
    }
    return null;
  }
}

export async function detectUserLocation(): Promise<DetectedLocation | null> {
  const cached = readCache();
  if (cached) return cached;

  if (!detectPromise) {
    detectPromise = detectUserLocationOnce().finally(() => {
      detectPromise = null;
    });
  }

  return detectPromise;
}

export function formatCityState(location: DetectedLocation): string {
  return [location.city, location.state].filter(Boolean).join(", ");
}
