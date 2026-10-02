/**
 * Peto Dynamic Geo Detector
 * Automatically detects user region, country, state, and timezone dynamically on every session.
 * Eliminates manual configuration while providing precise regional ad targeting.
 */

export interface DetectedLocation {
  country: string;
  region: string;
  state: string;
  district: string;
  city: string;
  timezone: string;
  source: "TIMEZONE" | "BROWSER_LOCALE" | "SERVER_GEO" | "DEFAULT";
}

// Common timezone to country and state mappings for zero-latency detection
const TIMEZONE_GEO_MAP: Record<string, { country: string; state: string; region: string }> = {
  // India
  "Asia/Kolkata": { country: "IN", state: "KL", region: "Kerala" },
  "Asia/Calcutta": { country: "IN", state: "MH", region: "Maharashtra" },

  // United States
  "America/New_York": { country: "US", state: "NY", region: "New York" },
  "America/Detroit": { country: "US", state: "MI", region: "Michigan" },
  "America/Kentucky/Louisville": { country: "US", state: "KY", region: "Kentucky" },
  "America/Chicago": { country: "US", state: "IL", region: "Illinois" },
  "America/Indiana/Indianapolis": { country: "US", state: "IN", region: "Indiana" },
  "America/Denver": { country: "US", state: "CO", region: "Colorado" },
  "America/Phoenix": { country: "US", state: "AZ", region: "Arizona" },
  "America/Los_Angeles": { country: "US", state: "CA", region: "California" },
  "America/Anchorage": { country: "US", state: "AK", region: "Alaska" },
  "Pacific/Honolulu": { country: "US", state: "HI", region: "Hawaii" },

  // United Kingdom
  "Europe/London": { country: "GB", state: "ENG", region: "England" },

  // Canada
  "America/Toronto": { country: "CA", state: "ON", region: "Ontario" },
  "America/Vancouver": { country: "CA", state: "BC", region: "British Columbia" },
  "America/Montreal": { country: "CA", state: "QC", region: "Quebec" },

  // Australia
  "Australia/Sydney": { country: "AU", state: "NSW", region: "New South Wales" },
  "Australia/Melbourne": { country: "AU", state: "VIC", region: "Victoria" },
  "Australia/Brisbane": { country: "AU", state: "QLD", region: "Queensland" },
  "Australia/Perth": { country: "AU", state: "WA", region: "Western Australia" },

  // Europe
  "Europe/Berlin": { country: "DE", state: "BE", region: "Berlin" },
  "Europe/Paris": { country: "FR", state: "IDF", region: "Île-de-France" },
  "Europe/Madrid": { country: "ES", state: "MD", region: "Madrid" },
  "Europe/Rome": { country: "IT", state: "LAZ", region: "Lazio" },
  "Europe/Amsterdam": { country: "NL", state: "NH", region: "North Holland" },

  // Middle East & Asia
  "Asia/Dubai": { country: "AE", state: "DU", region: "Dubai" },
  "Asia/Singapore": { country: "SG", state: "SG", region: "Singapore" },
  "Asia/Tokyo": { country: "JP", state: "13", region: "Tokyo" },

  // South America
  "America/Sao_Paulo": { country: "BR", state: "SP", region: "São Paulo" },
};

// Cached dynamic location in memory
let cachedLocation: DetectedLocation | null = null;
let isFetchingServerGeo = false;

/**
 * Perform synchronous immediate detection using browser Intl and locale APIs
 */
function detectLocalGeo(): DetectedLocation {
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (_) {}

  // 1. Timezone mapping check
  if (timezone && TIMEZONE_GEO_MAP[timezone]) {
    const geo = TIMEZONE_GEO_MAP[timezone];
    return {
      country: geo.country,
      region: geo.region,
      state: geo.state,
      district: "",
      city: "",
      timezone,
      source: "TIMEZONE",
    };
  }

  // 2. Browser locale parsing (e.g. "en-IN", "en-US", "en-GB")
  const locales = navigator.languages || [navigator.language];
  for (const loc of locales) {
    if (loc && loc.includes("-")) {
      const parts = loc.split("-");
      const countryCandidate = parts[parts.length - 1].toUpperCase();
      if (countryCandidate.length === 2) {
        return {
          country: countryCandidate,
          region: countryCandidate,
          state: "",
          district: "",
          city: "",
          timezone,
          source: "BROWSER_LOCALE",
        };
      }
    }
  }

  // 3. Fallback default
  return {
    country: "GLOBAL",
    region: "",
    state: "",
    district: "",
    city: "",
    timezone,
    source: "DEFAULT",
  };
}

/**
 * Returns the currently detected location immediately (synchronous)
 */
export function getAutoDetectedLocation(): DetectedLocation {
  if (cachedLocation) {
    return cachedLocation;
  }

  // Check sessionStorage for current session
  try {
    const stored = sessionStorage.getItem("peto_auto_location");
    if (stored) {
      cachedLocation = JSON.parse(stored);
      return cachedLocation!;
    }
  } catch (_) {}

  cachedLocation = detectLocalGeo();
  return cachedLocation;
}

/**
 * Asynchronously syncs with server region detection (IP / Cloudflare / edge proxy headers)
 * Non-blocking, updates cache for subsequent requests.
 */
export async function syncServerGeoLocation(): Promise<DetectedLocation> {
  if (isFetchingServerGeo) {
    return getAutoDetectedLocation();
  }

  isFetchingServerGeo = true;
  try {
    const local = getAutoDetectedLocation();
    const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

    const res = await fetch(`${API_BASE_URL}/regions/current`, {
      headers: {
        "x-user-timezone": local.timezone,
        "x-user-country": local.country !== "GLOBAL" ? local.country : "",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.detected_country && data.detected_country !== "GLOBAL") {
        const serverLoc: DetectedLocation = {
          country: data.detected_country,
          region: data.detected_location?.region || local.region || data.detected_country,
          state: data.detected_location?.state || local.state || "",
          district: data.detected_location?.district || local.district || "",
          city: data.detected_location?.city || local.city || "",
          timezone: local.timezone,
          source: "SERVER_GEO",
        };
        cachedLocation = serverLoc;
        try {
          sessionStorage.setItem("peto_auto_location", JSON.stringify(serverLoc));
        } catch (_) {}
        return serverLoc;
      }
    }
  } catch (_) {
    // Non-blocking fallback
  } finally {
    isFetchingServerGeo = false;
  }

  return getAutoDetectedLocation();
}

// Initiate background server geo detection on module load
if (typeof window !== "undefined") {
  syncServerGeoLocation().catch(() => {});
}
