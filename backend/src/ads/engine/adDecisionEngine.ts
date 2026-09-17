import { supabase } from "../../config/supabase";
import { getRegionalConfig } from "../../regions/regional.service";
import { AdRequestContext, AdDecisionResult } from "./adDecisionEngine.types";
import { FrequencyCapper } from "./frequencyCapper";
import { AdDemandRouter } from "../external/adDemandRouter";
import { AdControlsService } from "../adControls.service";
import { AdEventTrackerService } from "../adEventTracker.service";

export class AdDecisionEngine {
  /**
   * Main Ad Decision Pipeline with Unified Controls & Circuit Breakers
   */
  static async decide(context: AdRequestContext): Promise<AdDecisionResult> {
    const platform = (context.device || "WEB") as "WEB" | "ANDROID" | "IOS";
    const placement = context.placement || "FEED";

    // 1. Unified System Controls & Kill Switches
    const controls = await AdControlsService.getControls();

    if (!controls.all_ads_enabled || controls.emergency_stop_active) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: controls.emergency_stop_active
          ? `Ad serving stopped by emergency kill switch (${controls.emergency_stop_scope})`
          : "Global advertising is disabled by admin control",
      };
    }

    if (!AdControlsService.isPlatformEligible(platform, controls)) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: `Advertising disabled on platform (${platform})`,
      };
    }

    if (!AdControlsService.isPlacementEligible(placement, controls)) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: `Advertising disabled for placement (${placement})`,
      };
    }

    // 2. Regional Gate: Check if advertising is enabled in this country
    const regionalConfig = await getRegionalConfig(context.country);
    if (!regionalConfig.ads_enabled) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: `Advertising disabled in region (${context.country})`,
      };
    }

    // 3. Frequency & UX Safeguard Gate
    const frequencyCheck = FrequencyCapper.isEligible(context);
    if (!frequencyCheck.eligible) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: frequencyCheck.reason,
      };
    }

    // Log Ad Request Lifecycle Event
    AdEventTrackerService.logEvent({
      eventType: "AD_REQUEST",
      adSource: "PETO",
      placement,
      platform,
      country: context.country,
      userId: context.userId,
    }).catch(() => {});

    // 4. Candidate Retrieval from Peto Internal Marketplace (if internal ads enabled)
    if (controls.internal_ads_enabled) {
      const now = new Date().toISOString();

      try {
        const { data: campaigns } = await supabase
          .from("ad_campaigns")
          .select(`
            id,
            name,
            objective,
            daily_budget,
            total_budget,
            spent,
            start_date,
            end_date,
            status,
            advertiser:advertisers!inner(id, company_name, website_url, industry, status, balance),
            ad_creatives!inner(*),
            ad_targeting(*)
          `)
          .eq("status", "ACTIVE")
          .eq("advertisers.status", "ACTIVE")
          .lte("start_date", now)
          .or(`end_date.is.null,end_date.gte.${now}`);

        if (campaigns && campaigns.length > 0) {
          const scoredCandidates: Array<{ ad: any; score: number }> = [];

          for (const camp of campaigns) {
            const adv: any = Array.isArray(camp.advertiser) ? camp.advertiser[0] : camp.advertiser;
            if (!adv) continue;

            // Account Balance Check: Positive balance required
            const advBalance = parseFloat(adv.balance || "0");
            if (advBalance <= 0) continue;

            // Budget Cap Check
            const spent = parseFloat(camp.spent || "0");
            const totalBudget = parseFloat(camp.total_budget || "0");
            if (totalBudget > 0 && spent >= totalBudget) continue;

            // Prohibited category check
            const industry = (adv.industry || "").toUpperCase();
            if (
              regionalConfig.prohibited_ad_categories &&
              regionalConfig.prohibited_ad_categories.includes(industry)
            ) {
              continue;
            }

            // Approved creatives check
            const approvedCreatives = (camp.ad_creatives || []).filter(
              (cr: any) => cr.status === "APPROVED"
            );
            if (approvedCreatives.length === 0) continue;
            const creative = approvedCreatives[0];

            const targeting = camp.ad_targeting?.[0] || camp.ad_targeting || {};

            // Placement check
            if (targeting.placements && targeting.placements.length > 0) {
              const hasPlacement =
                targeting.placements.includes(context.placement) ||
                targeting.placements.includes("ALL");
              if (!hasPlacement) continue;
            }

            // Country check
            if (targeting.countries && targeting.countries.length > 0) {
              const upperCountries = targeting.countries.map((c: string) => c.toUpperCase());
              const hasCountry =
                upperCountries.includes("ALL") ||
                context.country === "GLOBAL" ||
                upperCountries.includes(context.country.toUpperCase());
              if (!hasCountry) continue;
            }

            // Device check
            if (context.device && targeting.devices && targeting.devices.length > 0) {
              const hasDevice =
                targeting.devices.includes(context.device) ||
                targeting.devices.includes("ALL");
              if (!hasDevice) continue;
            }

            // Scoring algorithm
            const dailyBudget = parseFloat(camp.daily_budget || "10");
            const bidScore = Math.min(dailyBudget / 25, 3.0);

            let relevanceScore = 1.0;
            if (context.petInterests && targeting.pet_interests) {
              const hasInterest = context.petInterests.some((pi) =>
                targeting.pet_interests.includes(pi)
              );
              if (hasInterest) relevanceScore = 1.6;
            }

            const pacingScore = Math.max(0.3, 1.0 - (totalBudget > 0 ? spent / totalBudget : 0));
            const finalScore = bidScore * relevanceScore * pacingScore;

            scoredCandidates.push({
              score: finalScore,
              ad: {
                id: camp.id,
                name: camp.name,
                objective: camp.objective,
                ad_source: "PETO",
                advertiser: {
                  id: adv.id,
                  company_name: adv.company_name,
                  website_url: adv.website_url,
                  industry: adv.industry,
                },
                creative: {
                  id: creative.id,
                  name: creative.name,
                  format: creative.format,
                  headline: creative.headline,
                  body_text: creative.body_text,
                  call_to_action: creative.call_to_action,
                  destination_url: creative.destination_url,
                  media_urls: creative.media_urls || [],
                },
                targeting: {
                  pet_interests: targeting.pet_interests || [],
                  placements: targeting.placements || [],
                },
              },
            });
          }

          if (scoredCandidates.length > 0) {
            scoredCandidates.sort((a, b) => b.score - a.score);
            const winner = scoredCandidates[0].ad;

            FrequencyCapper.recordDelivery(context.userId);

            AdEventTrackerService.logEvent({
              eventType: "AD_REQUEST_SUCCESS",
              adSource: "PETO",
              campaignId: winner.id,
              creativeId: winner.creative?.id,
              placement,
              platform,
              country: context.country,
              userId: context.userId,
            }).catch(() => {});

            return {
              hasAd: true,
              source: "PETO",
              ad: winner,
              decisionReason: "Won internal auction with deterministic score",
            };
          }
        }
      } catch (err: any) {
        // Fall through to external demand
      }
    }

    // 5. Secondary Demand: External Ad Networks (if external ads enabled)
    if (controls.external_ads_enabled) {
      // Log fallback to external
      AdEventTrackerService.logEvent({
        eventType: "AD_FALLBACK",
        adSource: "EXTERNAL",
        placement,
        platform,
        country: context.country,
        userId: context.userId,
        metadata: { reason: "Internal inventory unavailable" },
      }).catch(() => {});

      const externalDemand = await AdDemandRouter.requestExternalDemand(context);
      if (externalDemand.payload) {
        FrequencyCapper.recordDelivery(context.userId);

        AdEventTrackerService.logEvent({
          eventType: "AD_REQUEST_SUCCESS",
          adSource: "EXTERNAL",
          provider: externalDemand.network?.toUpperCase(),
          placement,
          platform,
          country: context.country,
          userId: context.userId,
        }).catch(() => {});

        return {
          hasAd: true,
          source: "EXTERNAL",
          externalNetwork: externalDemand.network || (platform === "WEB" ? "adsense" : "admob"),
          externalPayload: externalDemand.payload,
          decisionReason: `Delivered external demand (${externalDemand.network})`,
        };
      }
    }

    // 6. Safe Organic Fallback: never return broken/malformed ad object
    AdEventTrackerService.logEvent({
      eventType: "AD_REQUEST_FAILED",
      adSource: "PETO",
      placement,
      platform,
      country: context.country,
      userId: context.userId,
      metadata: { reason: "No eligible inventory or external fill" },
    }).catch(() => {});

    return {
      hasAd: false,
      source: "NONE",
      decisionReason: "No eligible ad inventory or external demand available",
    };
  }
}
