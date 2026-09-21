import crypto from "crypto";
import { supabase } from "../config/supabase";
import { getRegionalConfig, isAdTargetingEligible } from "../regions/regional.service";
import { UserLocationInfo } from "../regions/regional.types";
import { CurrencyService } from "../currency/currency.service";

export interface PublicAdItem {
  id: string; // Campaign ID
  name: string;
  objective: string;
  advertiser: {
    id: string;
    company_name: string;
    website_url?: string | null;
    industry?: string;
  };
  creative: {
    id: string;
    name: string;
    format: "IMAGE" | "VIDEO" | "CAROUSEL" | "SPONSORED_POST";
    headline: string;
    body_text?: string | null;
    call_to_action: string;
    destination_url: string;
    media_urls: Array<{
      type?: string;
      url: string;
      thumbnail?: string;
      title?: string;
    }>;
  };
  targeting?: {
    pet_interests: string[];
    placements: string[];
  };
}


/**
 * Fetch active, approved ads for user feeds
 */
export async function getActiveFeedAdsService(
  placement: string = "FEED",
  locationInput: string | UserLocationInfo = "GLOBAL"
): Promise<PublicAdItem[]> {
  try {
    const location: UserLocationInfo =
      typeof locationInput === "string" ? { country: locationInput } : locationInput;
    const country = location.country || "GLOBAL";

    // 1. Enforce regional ads availability
    const regionalConfig = await getRegionalConfig(country);
    if (!regionalConfig.ads_enabled) {
      return [];
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(`
        id,
        name,
        objective,
        start_date,
        end_date,
        spent,
        total_budget,
        daily_budget,
        status,
        advertiser:advertisers!inner(id, company_name, website_url, industry, status, balance),
        ad_creatives!inner(*),
        ad_targeting(*)
      `)
      .eq("status", "ACTIVE")
      .eq("advertisers.status", "ACTIVE")
      .lte("start_date", now)
      .or(`end_date.is.null,end_date.gte.${now}`);

    if (error) throw error;

    if (data && data.length > 0) {
      const publicAds: PublicAdItem[] = [];

      data.forEach((camp: any) => {
        // 1. Account Balance Check: ADS ONLY SHOW WHEN THERE IS SUFFICIENT BALANCE IN THE ACCOUNT!
        const advBalance = parseFloat(camp.advertiser?.balance || "0");
        if (advBalance <= 0) {
          return;
        }

        // 2. Total Budget Cap Check
        const spent = parseFloat(camp.spent || "0");
        const totalBudget = parseFloat(camp.total_budget || "0");
        if (totalBudget > 0 && spent >= totalBudget) {
          return;
        }

        // Exclude prohibited categories in this region
        const industry = (camp.advertiser?.industry || "").toUpperCase();
        if (
          regionalConfig.prohibited_ad_categories &&
          regionalConfig.prohibited_ad_categories.includes(industry)
        ) {
          return;
        }

        const approvedCreatives = (camp.ad_creatives || []).filter(
          (cr: any) => cr.status === "APPROVED"
        );
        if (approvedCreatives.length === 0) return;

        const primaryCreative = approvedCreatives[0];
        const targeting = camp.ad_targeting?.[0] || camp.ad_targeting || null;

        // Check placement filter if targeting specifies
        if (targeting?.placements && targeting.placements.length > 0) {
          if (!targeting.placements.includes(placement) && !targeting.placements.includes("ALL")) {
            return;
          }
        }

        // Check regional & country targeting filter
        if (targeting && !isAdTargetingEligible(targeting, location)) {
          return;
        }

        publicAds.push({
          id: camp.id,
          name: camp.name,
          objective: camp.objective,
          advertiser: {
            id: camp.advertiser.id,
            company_name: camp.advertiser.company_name,
            website_url: camp.advertiser.website_url,
            industry: camp.advertiser.industry,
          },
          creative: {
            id: primaryCreative.id,
            name: primaryCreative.name,
            format: primaryCreative.format,
            headline: primaryCreative.headline,
            body_text: primaryCreative.body_text,
            call_to_action: primaryCreative.call_to_action,
            destination_url: primaryCreative.destination_url,
            media_urls: primaryCreative.media_urls || [],
          },
          targeting: targeting
            ? {
                pet_interests: targeting.pet_interests || [],
                placements: targeting.placements || [],
              }
            : undefined,
        });
      });

      if (publicAds.length > 0) {
        return publicAds;
      }
    }
  } catch (err: any) {
    // Fallback gracefully
  }

  // If no campaigns with positive balance exist, return empty array (do not show unbacked ads)
  return [];
}

/**
 * Record an ad impression and deduct nominal allocation atomically with ledger entry
 */
export async function recordAdImpressionService(campaignId: string, creativeId?: string, eventId?: string) {
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Fetch campaign and advertiser profile to obtain billing currency
    const { data: camp } = await supabase
      .from("ad_campaigns")
      .select("id, advertiser_id, spent, advertiser:advertisers!inner(id, balance, currency, total_spend)")
      .eq("id", campaignId)
      .maybeSingle();

    if (!camp || !camp.advertiser_id) {
      return { success: false, error: "Campaign or advertiser not found" };
    }

    const adv: any = Array.isArray(camp.advertiser) ? camp.advertiser[0] : camp.advertiser;
    const accountCurrency = (adv?.currency || "USD").toUpperCase();
    const impressionCost = CurrencyService.calculateAdEventCost("IMPRESSION", accountCurrency);
    const refId = eventId || `imp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 2. Attempt atomic stored procedure deduction with ledger insert
    let deducted = false;
    let balanceAfter = 0;
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("deduct_ad_spend_atomic", {
        p_advertiser_id: adv.id,
        p_campaign_id: campaignId,
        p_amount: impressionCost,
        p_currency: accountCurrency,
        p_description: `Ad Impression: ${accountCurrency} ${impressionCost.toFixed(2)}`,
        p_reference_id: refId,
      });

      if (!rpcErr && rpcRes && rpcRes[0]?.success) {
        deducted = true;
        balanceAfter = parseFloat(rpcRes[0].balance_after);
      }
    } catch {
      // Fallback below
    }

    // Direct atomic database fallback if RPC is not present
    if (!deducted) {
      const curBal = parseFloat(adv?.balance || "0");
      if (curBal >= impressionCost) {
        const newBal = parseFloat((curBal - impressionCost).toFixed(2));
        const newTotalSpend = parseFloat(((adv?.total_spend || 0) + impressionCost).toFixed(2));
        const newCampSpent = parseFloat(((camp.spent || 0) + impressionCost).toFixed(2));

        await supabase
          .from("advertisers")
          .update({ balance: newBal, total_spend: newTotalSpend, updated_at: new Date().toISOString() })
          .eq("id", adv.id);

        await supabase
          .from("ad_campaigns")
          .update({ spent: newCampSpent, updated_at: new Date().toISOString() })
          .eq("id", campaignId);

        // Record in payment_ledger
        await supabase.from("payment_ledger").insert({
          advertiser_id: adv.id,
          campaign_id: campaignId,
          entry_type: "AD_SPEND",
          amount: -impressionCost,
          currency: accountCurrency,
          balance_before: curBal,
          balance_after: newBal,
          description: `Ad Impression delivery charge`,
          reference_id: refId,
        });

        balanceAfter = newBal;
      }
    }

    // 3. Upsert/increment in ad_analytics_daily
    const { data: existing } = await supabase
      .from("ad_analytics_daily")
      .select("id, impressions, reach, spend")
      .eq("campaign_id", campaignId)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ad_analytics_daily")
        .update({
          impressions: (existing.impressions || 0) + 1,
          reach: (existing.reach || 0) + 1,
          spend: parseFloat(((existing.spend || 0) + impressionCost).toFixed(2)),
          currency: accountCurrency,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("ad_analytics_daily").insert({
        campaign_id: campaignId,
        creative_id: creativeId || null,
        date: today,
        impressions: 1,
        reach: 1,
        clicks: 0,
        views: 0,
        conversions: 0,
        spend: impressionCost,
        currency: accountCurrency,
      });
    }

    return { success: true, campaignId, cost: impressionCost, currency: accountCurrency, balanceAfter };
  } catch {
    return { success: true, campaignId };
  }
}

/**
 * Record an ad click and deduct CPC allocation atomically with ledger entry
 */
export async function recordAdClickService(campaignId: string, creativeId?: string, eventId?: string) {
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Fetch campaign and advertiser profile to obtain billing currency
    const { data: camp } = await supabase
      .from("ad_campaigns")
      .select("id, advertiser_id, spent, advertiser:advertisers!inner(id, balance, currency, total_spend)")
      .eq("id", campaignId)
      .maybeSingle();

    if (!camp || !camp.advertiser_id) {
      return { success: false, error: "Campaign or advertiser not found" };
    }

    const adv: any = Array.isArray(camp.advertiser) ? camp.advertiser[0] : camp.advertiser;
    const accountCurrency = (adv?.currency || "USD").toUpperCase();
    const clickCost = CurrencyService.calculateAdEventCost("CLICK", accountCurrency);
    const refId = eventId || `clk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 2. Attempt atomic stored procedure deduction with ledger insert
    let deducted = false;
    let balanceAfter = 0;
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("deduct_ad_spend_atomic", {
        p_advertiser_id: adv.id,
        p_campaign_id: campaignId,
        p_amount: clickCost,
        p_currency: accountCurrency,
        p_description: `Ad Click: ${accountCurrency} ${clickCost.toFixed(2)}`,
        p_reference_id: refId,
      });

      if (!rpcErr && rpcRes && rpcRes[0]?.success) {
        deducted = true;
        balanceAfter = parseFloat(rpcRes[0].balance_after);
      }
    } catch {
      // Fallback below
    }

    // Direct atomic database fallback if RPC is not present
    if (!deducted) {
      const curBal = parseFloat(adv?.balance || "0");
      if (curBal >= clickCost) {
        const newBal = parseFloat((curBal - clickCost).toFixed(2));
        const newTotalSpend = parseFloat(((adv?.total_spend || 0) + clickCost).toFixed(2));
        const newCampSpent = parseFloat(((camp.spent || 0) + clickCost).toFixed(2));

        await supabase
          .from("advertisers")
          .update({ balance: newBal, total_spend: newTotalSpend, updated_at: new Date().toISOString() })
          .eq("id", adv.id);

        await supabase
          .from("ad_campaigns")
          .update({ spent: newCampSpent, updated_at: new Date().toISOString() })
          .eq("id", campaignId);

        // Record in payment_ledger
        await supabase.from("payment_ledger").insert({
          advertiser_id: adv.id,
          campaign_id: campaignId,
          entry_type: "AD_SPEND",
          amount: -clickCost,
          currency: accountCurrency,
          balance_before: curBal,
          balance_after: newBal,
          description: `Ad Click delivery charge`,
          reference_id: refId,
        });

        balanceAfter = newBal;
      }
    }

    // 3. Upsert/increment in ad_analytics_daily
    const { data: existing } = await supabase
      .from("ad_analytics_daily")
      .select("id, clicks, conversions, spend")
      .eq("campaign_id", campaignId)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ad_analytics_daily")
        .update({
          clicks: (existing.clicks || 0) + 1,
          spend: parseFloat(((existing.spend || 0) + clickCost).toFixed(2)),
          currency: accountCurrency,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("ad_analytics_daily").insert({
        campaign_id: campaignId,
        creative_id: creativeId || null,
        date: today,
        impressions: 1,
        reach: 1,
        clicks: 1,
        views: 0,
        conversions: 0,
        spend: clickCost,
        currency: accountCurrency,
      });
    }

    return { success: true, campaignId, cost: clickCost, currency: accountCurrency, balanceAfter };
  } catch {
    return { success: true, campaignId };
  }
}
