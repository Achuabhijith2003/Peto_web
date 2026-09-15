import { ExternalAdNetworkAdapter, ExternalAdPayload } from "./externalAdNetwork.interface";
import { AdRequestContext } from "../engine/adDecisionEngine.types";

export class AdMobAdapter implements ExternalAdNetworkAdapter {
  readonly networkName = "admob";

  // Standard Google AdMob test ad units for sandbox safety
  private readonly defaultAdUnits: Record<string, string> = {
    FEED: "ca-app-pub-3940256099942544/2247696110", // Native Advanced Test Unit
    REELS: "ca-app-pub-3940256099942544/1033173712", // Interstitial Test Unit
    COMMUNITY_FEED: "ca-app-pub-3940256099942544/6300978111", // Banner Test Unit
  };

  isAvailable(country: string): boolean {
    // AdMob is broadly available globally except in sanctioned regions
    const sanctioned = ["CU", "IR", "KP", "SY"];
    return !sanctioned.includes(country.toUpperCase());
  }

  async requestAd(context: AdRequestContext): Promise<ExternalAdPayload | null> {
    if (!this.isAvailable(context.country)) {
      return null;
    }

    const adUnitId =
      this.defaultAdUnits[context.placement] || this.defaultAdUnits.FEED;

    // Build client payload with network metadata
    return {
      network: "admob",
      adUnitId,
      format: context.placement === "REELS" ? "INTERSTITIAL" : "NATIVE",
      advertiserName: "Google AdMob Demand Partner",
      headline: "Discover Top Rated Pet Essentials",
      body: "Sponsored recommendation tailored for your pet companions.",
      callToAction: "Install Now",
      mediaUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800",
      sdkParameters: {
        adMobAppId: process.env.ADMOB_APP_ID || "ca-app-pub-3940256099942544~3347511713",
        testDeviceIds: ["EMULATOR"],
      },
    };
  }

  async recordImpression(networkPayload: any): Promise<void> {
    // Non-blocking telemetry
  }

  async recordClick(networkPayload: any): Promise<void> {
    // Non-blocking telemetry
  }
}
