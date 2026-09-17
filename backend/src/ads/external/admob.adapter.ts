import { ExternalAdNetworkAdapter, ExternalAdPayload } from "./externalAdNetwork.interface";
import { AdRequestContext } from "../engine/adDecisionEngine.types";

export class AdMobAdapter implements ExternalAdNetworkAdapter {
  readonly networkName = "admob";
  readonly supportedPlatforms: ("ANDROID" | "IOS" | "WEB")[] = ["ANDROID", "IOS"];

  // Google AdMob Official Test Units for Android
  private readonly androidTestUnits: Record<string, string> = {
    FEED: "ca-app-pub-3940256099942544/2247696110", // Native Advanced Test Unit
    REELS: "ca-app-pub-3940256099942544/1033173712", // Interstitial Test Unit
    COMMUNITY_FEED: "ca-app-pub-3940256099942544/6300978111", // Banner Test Unit
    EXPLORE: "ca-app-pub-3940256099942544/6300978111",
  };

  // Google AdMob Official Test Units for iOS
  private readonly iosTestUnits: Record<string, string> = {
    FEED: "ca-app-pub-3940256099942544/3986624511", // Native Advanced iOS Test Unit
    REELS: "ca-app-pub-3940256099942544/4411468910", // Interstitial iOS Test Unit
    COMMUNITY_FEED: "ca-app-pub-3940256099942544/2934735716", // Banner iOS Test Unit
    EXPLORE: "ca-app-pub-3940256099942544/2934735716",
  };

  isAvailable(country: string, platform?: string): boolean {
    if (platform === "WEB") return false; // AdMob is for mobile
    const sanctioned = ["CU", "IR", "KP", "SY"];
    return !sanctioned.includes(country.toUpperCase());
  }

  async requestAd(context: AdRequestContext): Promise<ExternalAdPayload | null> {
    const platform = (context.device === "IOS" ? "IOS" : "ANDROID") as "ANDROID" | "IOS";
    if (!this.isAvailable(context.country, platform)) {
      return null;
    }

    const env = process.env.AD_ENVIRONMENT || "DEVELOPMENT";
    const isProd = env === "PRODUCTION";

    // Ad Unit selection
    let adUnitId: string;
    let appId: string;

    if (platform === "IOS") {
      appId = isProd
        ? process.env.ADMOB_IOS_APP_ID || "ca-app-pub-8568607330093795~5945953018"
        : "ca-app-pub-8568607330093795~5945953018";
      adUnitId = isProd
        ? process.env.ADMOB_IOS_FEED_NATIVE_ID || this.iosTestUnits[context.placement] || this.iosTestUnits.FEED
        : this.iosTestUnits[context.placement] || this.iosTestUnits.FEED;
    } else {
      appId = isProd
        ? process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-8568607330093795~5945953018"
        : "ca-app-pub-8568607330093795~5945953018";
      adUnitId = isProd
        ? process.env.ADMOB_ANDROID_FEED_NATIVE_ID || this.androidTestUnits[context.placement] || this.androidTestUnits.FEED
        : this.androidTestUnits[context.placement] || this.androidTestUnits.FEED;
    }

    const format =
      context.placement === "REELS"
        ? "INTERSTITIAL"
        : context.placement === "COMMUNITY_FEED"
        ? "BANNER"
        : "NATIVE";

    return {
      ad_source: "EXTERNAL",
      external_provider: "ADMOB",
      network: "admob",
      platform,
      placement: context.placement,
      format,
      adUnitId,
      appId,
      headline: "Discover Quality Pet Supplies",
      body: "Curated companion accessories and healthcare essentials from verified AdMob partners.",
      callToAction: "Install Now",
      advertiserName: "Google AdMob Demand Network",
      mediaUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800",
      isTestAd: !isProd,
      sdkParameters: {
        appId,
        testDeviceIds: ["EMULATOR", "SIMULATOR"],
      },
    };
  }

  async recordImpression(_networkPayload: any): Promise<void> {
    // Non-blocking provider telemetry
  }

  async recordClick(_networkPayload: any): Promise<void> {
    // Non-blocking provider telemetry
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
