import { AdRequestContext } from "../engine/adDecisionEngine.types";

export interface ExternalAdPayload {
  network: string; // e.g. 'admob'
  adUnitId: string;
  format: "BANNER" | "NATIVE" | "INTERSTITIAL" | "REWARDED";
  headline?: string;
  body?: string;
  callToAction?: string;
  advertiserName?: string;
  mediaUrl?: string;
  trackingPayload?: Record<string, any>;
  sdkParameters?: Record<string, any>;
}

export interface ExternalAdNetworkAdapter {
  readonly networkName: string;

  isAvailable(country: string): boolean;

  requestAd(context: AdRequestContext): Promise<ExternalAdPayload | null>;

  recordImpression?(networkPayload: any): Promise<void>;

  recordClick?(networkPayload: any): Promise<void>;
}
