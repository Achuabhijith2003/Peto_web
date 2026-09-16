import { supabase } from "../../config/supabase";
import { getRegionalConfig } from "../../regions/regional.service";
import { AdRequestContext, AdDecisionResult } from "./adDecisionEngine.types";
import { FrequencyCapper } from "./frequencyCapper";
import { AdDemandRouter } from "../external/adDemandRouter";

export class AdDecisionEngine {
  /**
   * Main Ad Decision Pipeline
   */
  static async decide(context: AdRequestContext): Promise<AdDecisionResult> {
    // 1. Regional Gate: Check if advertising is enabled in this country
    const regionalConfig = await getRegionalConfig(context.country);
    if (!regionalConfig.ads_enabled) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: `Advertising disabled in region (${context.country})`,
      };
    }

    // 2. Frequency & UX Safeguard Gate
    const frequencyCheck = FrequencyCapper.isEligible(context);
    if (!frequencyCheck.eligible) {
      return {
        hasAd: false,
        source: "NONE",
        decisionReason: frequencyCheck.reason,
      };
    }

    // 3. Candidate Retrieval from Peto Internal Marketplace
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

          // Account Balance Check: Ads ONLY serve when advertiser has positive balance!
          const advBalance = parseFloat(adv.balance || "0");
          if (advBalance <= 0) continue;

          // Total Budget Cap Check: Do not serve if campaign budget reached
          const spent = parseFloat(camp.spent || "0");
          const totalBudget = parseFloat(camp.total_budget || "0");
          if (totalBudget > 0 && spent >= totalBudget) continue;

          // Category policy check
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

          // Country targeting check
          if (targeting.countries && targeting.countries.length > 0) {
            const upperCountries = targeting.countries.map((c: string) => c.toUpperCase());
            const hasCountry =
              upperCountries.includes("ALL") ||
              context.country === "GLOBAL" ||
              upperCountries.includes(context.country.toUpperCase());
            if (!hasCountry) continue;
          }

          // Device targeting check
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

        // Winner selection by highest score
        if (scoredCandidates.length > 0) {
          scoredCandidates.sort((a, b) => b.score - a.score);
          const winner = scoredCandidates[0].ad;

          // Record delivery to update frequency cap
          FrequencyCapper.recordDelivery(context.userId);

          return {
            hasAd: true,
            source: "PETO",
            ad: winner,
            decisionReason: `Won internal auction with deterministic score`,
          };
        }
      }
    } catch (err: any) {
      // Fall through to external networks
    }

    // 4. Secondary Demand: External Ad Networks (AdMob, etc.)
    const externalDemand = await AdDemandRouter.requestExternalDemand(context);
    if (externalDemand.payload) {
      FrequencyCapper.recordDelivery(context.userId);
      return {
        hasAd: true,
        source: "EXTERNAL",
        externalNetwork: externalDemand.network || "admob",
        externalPayload: externalDemand.payload,
        decisionReason: `Delivered external network demand (${externalDemand.network})`,
      };
    }

    // 5. Fallback: Safe organic delivery
    return {
      hasAd: false,
      source: "NONE",
      decisionReason: "No eligible ad inventory or external demand available",
    };
  }
}
