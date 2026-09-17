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

    const publisherId =
      process.env.GOOGLE_ADSENSE_CLIENT_ID ||
      process.env.ADSENSE_CLIENT_ID ||
      process.env.ADMOB_WEB_CLIENT_ID ||
      "ca-pub-8568607330093795";

    const slotId =
      process.env.GOOGLE_ADSENSE_FEED_SLOT_ID ||
      "4689992923";

    const layoutKey =
      process.env.GOOGLE_ADSENSE_FEED_LAYOUT_KEY ||
      "-6t+ed+2i-1n-4w";

    return {
      ad_source: "EXTERNAL",
      external_provider: "ADSENSE",
      network: "adsense",
      platform: "WEB",
      placement: context.placement,
      format: "FLUID",
      adUnitId: slotId,
      appId: publisherId,
      layoutKey,
      headline: "Curated Pet Care & Lifestyle Recommendations",
      body: "Discover trusted health supplements, accessories, and nutrition from Google AdSense verified sponsors.",
      callToAction: "Learn More",
      advertiserName: "Google Partner Network",
      mediaUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800",
      htmlSnippet: `
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-format="fluid"
             data-ad-layout-key="${layoutKey}"
             data-ad-client="${publisherId}"
             data-ad-slot="${slotId}"></ins>
      `.trim(),
      isTestAd: !isProd,
      sdkParameters: {
        publisherId,
        slotId,
        layoutKey,
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
