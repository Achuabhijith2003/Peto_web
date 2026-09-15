import { Request } from "express";
import { supabase } from "../config/supabase";
import { RegionalConfig } from "./regional.types";
import { createAuditLog } from "../admin/services/adminAudit.service";

// ============================================================
// RESILIENT RUNTIME DEFAULTS (Baseline configurations)
// ============================================================

export const DEFAULT_GLOBAL_CONFIG: RegionalConfig = {
  id: "00000000-0000-0000-0000-000000000001",
  level: "GLOBAL",
  code: "GLOBAL",
  name: "Global Default Baseline",
  continent: "GLOBAL",
  parent_code: null,
  ads_enabled: true,
  advertiser_registration_enabled: true,
  payments_enabled: true,
  creator_monetization_enabled: false,
  communities_enabled: true,
  reels_enabled: true,
  supported_currencies: ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"],
  default_currency: "USD",
  supported_payment_providers: ["STRIPE"],
  default_payment_provider: "STRIPE",
  allowed_ad_categories: [
    "PET_FOOD",
    "VET_HEALTH",
    "PET_ACCESSORIES",
    "PET_CARE",
    "PET_ADOPTION",
    "PET_TRAINING",
    "SERVICES",
  ],
  restricted_ad_categories: ["PET_SUPPLEMENTS", "BREEDING_SERVICES"],
  prohibited_ad_categories: [
    "ILLEGAL_WILDLIFE",
    "UNTESTED_MEDICATION",
    "ANIMAL_FIGHTING",
    "ADULT_CONTENT",
    "GAMBLING",
    "WEAPONS",
    "COUNTERFEIT",
  ],
  external_ad_networks: {
    admob: { enabled: true, priority: 1, floor_cpm: 0.5 },
  },
  policy_references: {
    advertising_policy_version: "1.0.0",
    tax_policy: "standard",
  },
  custom_flags: {},
  is_active: true,
};

export const RUNTIME_REGIONAL_STORE: Record<string, RegionalConfig> = {
  GLOBAL: DEFAULT_GLOBAL_CONFIG,
  IN: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000002",
    level: "COUNTRY",
    code: "IN",
    name: "India",
    continent: "ASIA",
    parent_code: "GLOBAL",
    creator_monetization_enabled: true,
    supported_currencies: ["INR", "USD"],
    default_currency: "INR",
    supported_payment_providers: ["RAZORPAY", "STRIPE"],
    default_payment_provider: "RAZORPAY",
    external_ad_networks: {
      admob: { enabled: true, priority: 1, floor_cpm: 0.3 },
    },
    policy_references: {
      advertising_policy_version: "1.0.0",
      tax_policy: "gst_india",
      gst_rate: 0.18,
    },
  },
  US: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000003",
    level: "COUNTRY",
    code: "US",
    name: "United States",
    continent: "NORTH_AMERICA",
    parent_code: "GLOBAL",
    creator_monetization_enabled: true,
    supported_currencies: ["USD"],
    default_currency: "USD",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
    external_ad_networks: {
      admob: { enabled: true, priority: 1, floor_cpm: 1.5 },
    },
    policy_references: {
      advertising_policy_version: "1.0.0",
      tax_policy: "sales_tax_us",
    },
  },
  GB: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000004",
    level: "COUNTRY",
    code: "GB",
    name: "United Kingdom",
    continent: "EUROPE",
    parent_code: "GLOBAL",
    creator_monetization_enabled: true,
    supported_currencies: ["GBP", "EUR", "USD"],
    default_currency: "GBP",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
    external_ad_networks: {
      admob: { enabled: true, priority: 1, floor_cpm: 1.2 },
    },
    policy_references: {
      advertising_policy_version: "1.0.0",
      tax_policy: "vat_uk",
      vat_rate: 0.2,
    },
  },
  CA: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000005",
    level: "COUNTRY",
    code: "CA",
    name: "Canada",
    continent: "NORTH_AMERICA",
    parent_code: "GLOBAL",
    supported_currencies: ["CAD", "USD"],
    default_currency: "CAD",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
  AU: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000006",
    level: "COUNTRY",
    code: "AU",
    name: "Australia",
    continent: "OCEANIA",
    parent_code: "GLOBAL",
    supported_currencies: ["AUD", "USD"],
    default_currency: "AUD",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
  DE: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000007",
    level: "COUNTRY",
    code: "DE",
    name: "Germany",
    continent: "EUROPE",
    parent_code: "GLOBAL",
    supported_currencies: ["EUR", "USD"],
    default_currency: "EUR",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
  FR: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000008",
    level: "COUNTRY",
    code: "FR",
    name: "France",
    continent: "EUROPE",
    parent_code: "GLOBAL",
    supported_currencies: ["EUR", "USD"],
    default_currency: "EUR",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
  JP: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000009",
    level: "COUNTRY",
    code: "JP",
    name: "Japan",
    continent: "ASIA",
    parent_code: "GLOBAL",
    supported_currencies: ["JPY", "USD"],
    default_currency: "JPY",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
  BR: {
    ...DEFAULT_GLOBAL_CONFIG,
    id: "00000000-0000-0000-0000-000000000010",
    level: "COUNTRY",
    code: "BR",
    name: "Brazil",
    continent: "SOUTH_AMERICA",
    parent_code: "GLOBAL",
    supported_currencies: ["BRL", "USD"],
    default_currency: "BRL",
    supported_payment_providers: ["STRIPE"],
    default_payment_provider: "STRIPE",
  },
};

// In-memory cache for ultra-low latency lookups during feed serving
let cachedConfigs: Record<string, RegionalConfig> = { ...RUNTIME_REGIONAL_STORE };
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

/**
 * Resolve country code from incoming request headers
 */
export function resolveCountryFromRequest(req: Request): string {
  // 1. Check Cloudflare / Reverse proxy standard geo headers
  const cfCountry = req.headers["cf-ipcountry"];
  if (typeof cfCountry === "string" && cfCountry.length === 2) {
    return cfCountry.toUpperCase();
  }

  const xCountry = req.headers["x-country-code"] || req.headers["x-geo-country"];
  if (typeof xCountry === "string" && xCountry.length === 2) {
    return xCountry.toUpperCase();
  }

  // 2. Check query parameter override if caller provides explicitly (e.g. client app passing localized country)
  const queryCountry = req.query.country || req.query.region;
  if (typeof queryCountry === "string" && queryCountry.length === 2) {
    return queryCountry.toUpperCase();
  }

  // 3. Fallback to default
  return "GLOBAL";
}

/**
 * Load all regional configs from Supabase or fallback to runtime store
 */
export async function getAllRegionalConfigs(): Promise<RegionalConfig[]> {
  const now = Date.now();
  if (now - lastCacheTime < CACHE_TTL_MS && Object.keys(cachedConfigs).length > 1) {
    return Object.values(cachedConfigs);
  }

  try {
    const { data, error } = await supabase
      .from("regional_configs")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      const refreshed: Record<string, RegionalConfig> = {};
      data.forEach((row: any) => {
        refreshed[row.code.toUpperCase()] = row as RegionalConfig;
      });
      cachedConfigs = refreshed;
      lastCacheTime = now;
      return Object.values(refreshed);
    }
  } catch (err) {
    // Database query delay fallback
  }

  return Object.values(cachedConfigs);
}

/**
 * Retrieve regional configuration for a specific country or fallback to GLOBAL
 */
export async function getRegionalConfig(countryCode?: string): Promise<RegionalConfig> {
  const code = (countryCode || "GLOBAL").toUpperCase().trim();

  // Try cache first
  if (cachedConfigs[code]) {
    return cachedConfigs[code];
  }

  try {
    const { data, error } = await supabase
      .from("regional_configs")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      cachedConfigs[code] = data as RegionalConfig;
      return data as RegionalConfig;
    }
  } catch (err) {
    // Graceful fallback
  }

  // Fallback to runtime store for known country or GLOBAL
  return RUNTIME_REGIONAL_STORE[code] || cachedConfigs["GLOBAL"] || DEFAULT_GLOBAL_CONFIG;
}

/**
 * Update regional configuration (Admin privilege required)
 */
export async function updateRegionalConfigService(
  code: string,
  updates: Partial<RegionalConfig>,
  adminId?: string,
  req?: Request
): Promise<RegionalConfig> {
  const targetCode = code.toUpperCase().trim();

  const payload = {
    ...updates,
    updated_by: adminId || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("regional_configs")
      .update(payload)
      .eq("code", targetCode)
      .select()
      .single();

    if (error) {
      // If table row doesn't exist yet, try inserting
      const { data: inserted, error: insertError } = await supabase
        .from("regional_configs")
        .insert([{ ...payload, code: targetCode }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (inserted) {
        cachedConfigs[targetCode] = inserted as RegionalConfig;
      }
    } else if (data) {
      cachedConfigs[targetCode] = data as RegionalConfig;
    }
  } catch (err: any) {
    // Update runtime memory store to guarantee immediate responsiveness
    const current = cachedConfigs[targetCode] || { ...DEFAULT_GLOBAL_CONFIG, code: targetCode };
    cachedConfigs[targetCode] = { ...current, ...updates, updated_at: new Date().toISOString() };
  }

  // Audit log entry
  await createAuditLog(
    {
      adminId,
      action: "UPDATE_REGIONAL_CONFIG",
      resourceType: "REGIONAL_CONFIG",
      resourceId: targetCode,
      details: { code: targetCode, updates },
    },
    req
  );

  return cachedConfigs[targetCode];
}

// ============================================================
// REGIONAL GUARDS & ASSERTIONS (Backend Enforcement)
// ============================================================

export async function assertAdsEnabled(countryCode: string): Promise<void> {
  const config = await getRegionalConfig(countryCode);
  if (!config.ads_enabled) {
    const error: any = new Error(
      `Advertising services are currently disabled in your region (${config.name || countryCode}).`
    );
    error.status = 403;
    error.code = "REGION_ADS_DISABLED";
    throw error;
  }
}

export async function assertPaymentsEnabled(countryCode: string): Promise<void> {
  const config = await getRegionalConfig(countryCode);
  if (!config.payments_enabled) {
    const error: any = new Error(
      `Monetization and payments are currently restricted in your region (${config.name || countryCode}).`
    );
    error.status = 403;
    error.code = "REGION_PAYMENTS_DISABLED";
    throw error;
  }
}

export async function assertAdvertiserRegistrationEnabled(countryCode: string): Promise<void> {
  const config = await getRegionalConfig(countryCode);
  if (!config.advertiser_registration_enabled) {
    const error: any = new Error(
      `Advertiser registration is currently unavailable in your region (${config.name || countryCode}).`
    );
    error.status = 403;
    error.code = "REGION_ADVERTISER_REGISTRATION_DISABLED";
    throw error;
  }
}
