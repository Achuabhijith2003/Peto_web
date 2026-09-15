export type RegionalLevel = 'GLOBAL' | 'CONTINENT' | 'COUNTRY' | 'STATE' | 'CITY';

export interface RegionalConfig {
  id: string;
  level: RegionalLevel;
  code: string;
  name: string;
  continent?: string | null;
  parent_code?: string | null;

  // Features
  ads_enabled: boolean;
  advertiser_registration_enabled: boolean;
  payments_enabled: boolean;
  creator_monetization_enabled: boolean;
  communities_enabled: boolean;
  reels_enabled: boolean;

  // Currencies & Payment Providers
  supported_currencies: string[];
  default_currency: string;
  supported_payment_providers: string[];
  default_payment_provider: string;

  // Ad Policy & Categories
  allowed_ad_categories: string[];
  restricted_ad_categories: string[];
  prohibited_ad_categories: string[];

  // External Ad Networks (e.g. AdMob)
  external_ad_networks: Record<
    string,
    {
      enabled: boolean;
      priority?: number;
      floor_cpm?: number;
      [key: string]: any;
    }
  >;

  // Legal & Compliance
  policy_references: Record<string, any>;
  custom_flags: Record<string, any>;
  is_active: boolean;

  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
