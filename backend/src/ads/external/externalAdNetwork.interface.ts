import { AdRequestContext } from "../engine/adDecisionEngine.types";

export type ExternalProviderType = "ADMOB" | "ADSENSE" | "AD_MANAGER" | "OTHER";

export interface ExternalAdPayload {
  ad_source: "EXTERNAL";
  external_provider: ExternalProviderType;
  network: string; // backwards-compatible alias
  platform: "ANDROID" | "IOS" | "WEB";
  placement: string;
  format: "BANNER" | "NATIVE" | "INTERSTITIAL" | "REWARDED" | "FLUID";
  adUnitId: string;
  appId?: string;
  layoutKey?: string;
  headline?: string;
  body?: string;
  callToAction?: string;
  advertiserName?: string;
  mediaUrl?: string;
  htmlSnippet?: string; // For Web AdSense / Ad Manager responsive display
  sdkParameters?: Record<string, any>;
  trackingPayload?: Record<string, any>;
  isTestAd?: boolean;
}

export interface ExternalAdNetworkAdapter {
  readonly networkName: string;
  readonly supportedPlatforms: ("ANDROID" | "IOS" | "WEB")[];

  isAvailable(country: string, platform?: string): boolean;

  requestAd(context: AdRequestContext): Promise<ExternalAdPayload | null>;

  recordImpression?(networkPayload: any): Promise<void>;

  recordClick?(networkPayload: any): Promise<void>;

  getProviderStatus?(): Promise<any>;

  healthCheck?(): Promise<boolean>;
}
