import { ExternalAdNetworkAdapter, ExternalAdPayload } from "./externalAdNetwork.interface";
import { AdRequestContext } from "../engine/adDecisionEngine.types";

export class WebAdsAdapter implements ExternalAdNetworkAdapter {
  readonly networkName = "adsense";
  readonly supportedPlatforms: ("ANDROID" | "IOS" | "WEB")[] = ["WEB"];

  private readonly testUnits: Record<string, string> = {
    FEED: "peto_web_feed_responsive_01",
    COMMUNITY_FEED: "peto_web_community_banner_01",
    REELS: "peto_web_reels_sidebar_01",
    EXPLORE: "peto_web_explore_banner_01",
  };

  isAvailable(country: string, platform?: string): boolean {
    if (platform && platform !== "WEB") return false;
    const sanctioned = ["CU", "IR", "KP", "SY"];
    return !sanctioned.includes(country.toUpperCase());
  }

  async requestAd(context: AdRequestContext): Promise<ExternalAdPayload | null> {
    if (!this.isAvailable(context.country, "WEB")) {
      return null;
    }

    const env = process.env.AD_ENVIRONMENT || "DEVELOPMENT";
    const isProd = env === "PRODUCTION";

    const publisherId = isProd
      ? process.env.GOOGLE_ADSENSE_CLIENT_ID || "ca-pub-0000000000000000"
      : "ca-pub-0000000000000000";

    const slotId =
      this.testUnits[context.placement] || this.testUnits.FEED;

    return {
      ad_source: "EXTERNAL",
      external_provider: "ADSENSE",
      network: "adsense",
      platform: "WEB",
      placement: context.placement,
      format: "BANNER",
      adUnitId: slotId,
      appId: publisherId,
      headline: "Premium Organic Pet Nutrition & Wellness",
      body: "Wholesome, human-grade food and holistic health products delivered directly to your door.",
      callToAction: "Learn More",
      advertiserName: "Google Web Ads Network",
      mediaUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800",
      htmlSnippet: `
        <div class="peto-web-external-ad" data-ad-client="${publisherId}" data-ad-slot="${slotId}" data-ad-format="auto">
          <span class="text-[10px] text-slate-400 font-semibold tracking-wider">ADSENSE PARTNER</span>
        </div>
      `.trim(),
      isTestAd: !isProd,
      sdkParameters: {
        publisherId,
        slotId,
        testMode: !isProd,
      },
    };
  }

  async recordImpression(_networkPayload: any): Promise<void> {
    // Non-blocking telemetry
  }

  async recordClick(_networkPayload: any): Promise<void> {
    // Non-blocking telemetry
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
