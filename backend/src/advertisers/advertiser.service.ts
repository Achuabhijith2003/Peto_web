import crypto from "crypto";
import { supabase } from "../config/supabase";
import { assertAdvertiserRegistrationEnabled, assertAdsEnabled } from "../regions/regional.service";
import { createAdminNotificationService } from "../admin/services/adminNotifications.service";
import { createNotification } from "../notifications/notification.service";

export interface RegisterAdvertiserInput {
  // CamelCase
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  websiteUrl?: string;
  industry?: string;
  country?: string;
  currency?: string;

  // Snake_case (UI form inputs)
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  billing_email?: string;
  contact_phone?: string;
  website_url?: string;
  country_code?: string;
  tax_id?: string;
}

export interface CreateCampaignInput {
  name: string;
  objective: string;
  budgetType?: "DAILY" | "LIFETIME";
  budget_type?: "DAILY" | "LIFETIME";
  totalBudget?: number;
  total_budget?: number;
  dailyBudget?: number;
  daily_budget?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;

  // Targeting
  targeting?: {
    countries?: string[];
    locations?: string[];
    regions?: string[];
    languages?: string[];
    petInterests?: string[];
    interests?: string[];
    pet_interests?: string[];
    pet_types?: string[];
    devices?: string[];
    placements?: string[];
  };

  // Creative
  creative: {
    name?: string;
    format?: "IMAGE" | "VIDEO" | "CAROUSEL" | "SPONSORED_POST";
    headline: string;
    bodyText?: string;
    body_text?: string;
    callToAction?: string;
    call_to_action?: string;
    destinationUrl?: string;
    destination_url?: string;
    mediaUrls?: Array<{
      type?: string;
      url: string;
      thumbnail?: string;
      title?: string;
    }>;
    media_urls?: Array<{
      type?: string;
      url: string;
      thumbnail?: string;
      title?: string;
    }>;
  };
}

export class AdvertiserService {
  /**
   * Get advertiser profile associated with user
   */
  static async getAdvertiserByUserId(userId: string) {
    const { data, error } = await supabase
      .from("advertisers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Register or update advertiser account for user
   */
  static async registerAdvertiser(userId: string, input: RegisterAdvertiserInput) {
    const companyName = (input.companyName || input.company_name || "").trim();
    if (!companyName) {
      const error: any = new Error("Company or business name is required.");
      error.status = 400;
      throw error;
    }

    let contactEmail = (input.contactEmail || input.contact_email || input.billing_email || "").trim();
    let contactName = (input.contactName || input.contact_name || "").trim();
    const websiteUrl = input.websiteUrl || input.website_url || null;
    const industry = input.industry || "PET_CARE";
    const country = (input.country || input.country_code || "GLOBAL").toUpperCase().trim();
    const currency = (input.currency || (country === "IN" ? "INR" : "USD")).toUpperCase().trim();

    // If contactName or contactEmail are empty, pull user profile details
    if (!contactName || !contactEmail) {
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", userId)
          .maybeSingle();

        if (userProfile) {
          if (!contactName) {
            contactName = userProfile.full_name || userProfile.username || companyName;
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    if (!contactName) {
      contactName = companyName;
    }

    if (!contactEmail) {
      contactEmail = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "") || "advertiser"}@peto.app`;
    }

    await assertAdvertiserRegistrationEnabled(country);

    // Check if advertiser already exists for this user
    const existing = await this.getAdvertiserByUserId(userId);
    if (existing) {
      const { data, error } = await supabase
        .from("advertisers")
        .update({
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail,
          website_url: websiteUrl,
          industry: industry,
          currency: currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new advertiser
    const { data, error } = await supabase
      .from("advertisers")
      .insert({
        user_id: userId,
        company_name: companyName,
        contact_name: contactName,
        contact_email: contactEmail,
        website_url: websiteUrl,
        industry: industry,
        currency: currency,
        status: "ACTIVE",
        balance: 0.0,
        total_spend: 0.0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new campaign with targeting and creative (Mandatory PENDING_REVIEW state)
   */
  static async createCampaign(userId: string, input: CreateCampaignInput) {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) {
      const error: any = new Error("Advertiser profile not found. Please register as an advertiser first.");
      error.status = 403;
      throw error;
    }

    if (advertiser.status === "SUSPENDED" || advertiser.status === "BANNED") {
      const error: any = new Error("Your advertiser account is suspended or restricted from creating campaigns.");
      error.status = 403;
      throw error;
    }

    // Mandatory Verification Gate: Verification must be approved
    if (advertiser.verification_status !== "APPROVED") {
      const vStatus = advertiser.verification_status || "NOT_STARTED";
      let statusDesc = "unverified";
      if (vStatus === "SUBMITTED" || vStatus === "UNDER_REVIEW") statusDesc = "under review";
      else if (vStatus === "ADDITIONAL_INFORMATION_REQUIRED") statusDesc = "awaiting additional documentation";
      else if (vStatus === "REJECTED") statusDesc = "rejected";
      else if (vStatus === "SUSPENDED" || vStatus === "REVOKED") statusDesc = "suspended or revoked";

      const error: any = new Error(
        `Campaign creation blocked: Advertiser partner verification is currently ${statusDesc}. Complete and obtain approved verification before publishing campaigns.`
      );
      error.status = 403;
      error.code = "VERIFICATION_REQUIRED";
      error.verification_status = vStatus;
      throw error;
    }

    const name = input.name || "Peto Ad Campaign";
    const rawTotalBudget = input.totalBudget ?? input.total_budget;
    const totalBudget = Number(rawTotalBudget || 0);

    if (totalBudget <= 0) {
      const error: any = new Error("Total budget must be greater than zero.");
      error.status = 400;
      throw error;
    }

    const budgetType = input.budgetType || input.budget_type || "DAILY";
    const rawDailyBudget = input.dailyBudget ?? input.daily_budget;
    const dailyBudget = Number(rawDailyBudget ?? (totalBudget > 0 ? totalBudget / 30 : 10));

    // Normalize objective (e.g. BRAND_AWARENESS -> AWARENESS)
    let objective = (input.objective || "AWARENESS").toUpperCase();
    if (objective.includes("AWARENESS")) objective = "AWARENESS";
    else if (objective.includes("TRAFFIC")) objective = "TRAFFIC";
    else if (objective.includes("ENGAGE")) objective = "ENGAGEMENT";
    else if (objective.includes("CONVER")) objective = "CONVERSIONS";
    else if (objective.includes("APP")) objective = "APP_PROMOTION";
    else objective = "AWARENESS";

    const destinationUrl = input.creative.destinationUrl || input.creative.destination_url || "https://peto.app";

    // Destination URL validation
    try {
      const parsedUrl = new URL(destinationUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      const error: any = new Error("Destination URL must be a valid HTTP or HTTPS web address.");
      error.status = 400;
      throw error;
    }

    const targetingCountries = input.targeting?.countries || input.targeting?.locations || ["ALL"];
    const primaryCountry = targetingCountries[0] || "GLOBAL";
    await assertAdsEnabled(primaryCountry);

    // 1. Create Campaign in PENDING_REVIEW status
    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .insert({
        advertiser_id: advertiser.id,
        name: name,
        objective: objective,
        budget_type: budgetType,
        total_budget: totalBudget,
        daily_budget: dailyBudget,
        currency: advertiser.currency || "USD",
        spent: 0.0,
        start_date: input.startDate || input.start_date || new Date().toISOString(),
        end_date: input.endDate || input.end_date || null,
        status: "PENDING_REVIEW", // Mandatory review state!
      })
      .select()
      .single();

    if (campError) throw campError;

    // 2. Insert Targeting parameters
    await supabase.from("ad_targeting").insert({
      campaign_id: campaign.id,
      countries: targetingCountries,
      regions: input.targeting?.regions || [],
      languages: input.targeting?.languages || ["en"],
      pet_interests: input.targeting?.petInterests || input.targeting?.interests || input.targeting?.pet_interests || ["DOGS", "CATS"],
      devices: input.targeting?.devices || ["ALL"],
      placements: input.targeting?.placements || ["FEED", "REELS"],
    });

    // 3. Insert Creative in PENDING_REVIEW status
    const mediaUrls = input.creative.mediaUrls || input.creative.media_urls || [];
    const { data: creative, error: creatError } = await supabase
      .from("ad_creatives")
      .insert({
        campaign_id: campaign.id,
        name: input.creative.name || `${name} Creative`,
        format: input.creative.format || "IMAGE",
        headline: input.creative.headline,
        body_text: input.creative.bodyText || input.creative.body_text || null,
        call_to_action: input.creative.callToAction || input.creative.call_to_action || "LEARN_MORE",
        destination_url: destinationUrl,
        media_urls: mediaUrls,
        status: "PENDING_REVIEW",
      })
      .select()
      .single();

    if (creatError) throw creatError;

    // 4. Trigger Admin Notification for Approval Queue
    await createAdminNotificationService({
      category: "PENDING_ADVERTISEMENT",
      priority: "HIGH",
      title: "New Ad Campaign Submitted for Review",
      message: `Advertiser "${advertiser.company_name}" submitted campaign "${campaign.name}" (${advertiser.currency || "USD"} ${campaign.total_budget}) for compliance review.`,
      link: `/ads?tab=queue&campaignId=${campaign.id}`,
      metadata: {
        campaign_id: campaign.id,
        advertiser_id: advertiser.id,
        creative_id: creative?.id,
      },
      dedup_key: `ad_submission_${campaign.id}`,
    });

    // 5. Notify the advertiser user
    await createNotification({
      recipientId: userId,
      type: "mention",
      message: `Your campaign "${campaign.name}" was submitted and is now pending review by our trust & safety team.`,
    }).catch(() => {});

    return {
      campaign,
      creative,
    };
  }

  /**
   * Get all campaigns for the current advertiser
   */
  static async getCampaigns(userId: string) {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) return [];

    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(`
        *,
        ad_targeting(*),
        ad_creatives(*)
      `)
      .eq("advertiser_id", advertiser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update campaign status (e.g. Pause / Resume by advertiser)
   */
  static async updateCampaignStatus(userId: string, campaignId: string, status: "ACTIVE" | "PAUSED") {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) throw new Error("Advertiser not found");

    // Fetch existing campaign
    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("advertiser_id", advertiser.id)
      .single();

    if (campError || !campaign) throw new Error("Campaign not found");

    // Advertisers cannot self-activate a rejected or pending campaign
    if (status === "ACTIVE" && campaign.status !== "PAUSED" && campaign.status !== "ACTIVE") {
      const error: any = new Error("Campaign must be approved by Peto review before it can be activated.");
      error.status = 400;
      throw error;
    }

    const { data, error } = await supabase
      .from("ad_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing campaign's parameters (name, budget, schedule, objective)
   */
  static async updateCampaign(
    userId: string,
    campaignId: string,
    updates: {
      name?: string;
      daily_budget?: number;
      total_budget?: number;
      start_date?: string;
      end_date?: string;
      objective?: string;
    }
  ) {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) throw new Error("Advertiser not found");

    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("advertiser_id", advertiser.id)
      .single();

    if (campError || !campaign) throw new Error("Campaign not found");

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) payload.name = updates.name.trim();
    if (updates.daily_budget !== undefined) payload.daily_budget = Number(updates.daily_budget);
    if (updates.total_budget !== undefined) payload.total_budget = Number(updates.total_budget);
    if (updates.start_date) payload.start_date = updates.start_date;
    if (updates.end_date !== undefined) payload.end_date = updates.end_date || null;
    if (updates.objective) payload.objective = updates.objective;

    const { data, error } = await supabase
      .from("ad_campaigns")
      .update(payload)
      .eq("id", campaignId)
      .select(`
        *,
        ad_targeting(*),
        ad_creatives(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete an existing campaign belonging to the advertiser
   */
  static async deleteCampaign(userId: string, campaignId: string) {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) throw new Error("Advertiser not found");

    // Verify ownership
    const { data: campaign, error: campError } = await supabase
      .from("ad_campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .eq("advertiser_id", advertiser.id)
      .single();

    if (campError || !campaign) throw new Error("Campaign not found");

    // Delete associated targeting, creatives, and campaign
    await supabase.from("ad_targeting").delete().eq("campaign_id", campaignId);
    await supabase.from("ad_creatives").delete().eq("campaign_id", campaignId);
    const { error } = await supabase.from("ad_campaigns").delete().eq("id", campaignId);

    if (error) throw error;
    return { success: true, message: "Campaign deleted successfully." };
  }

  /**
   * Get billing summary, balance, and transaction history
   */
  static async getBillingSummary(userId: string) {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) {
      return {
        balance: 0.0,
        total_spend: 0.0,
        transactions: [],
        ledger: [],
      };
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("advertiser_id", advertiser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch ledger
    const { data: ledger } = await supabase
      .from("payment_ledger")
      .select("*")
      .eq("advertiser_id", advertiser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      balance: parseFloat(advertiser.balance || "0"),
      total_spend: parseFloat(advertiser.total_spend || "0"),
      status: advertiser.status,
      transactions: transactions || [],
      ledger: ledger || [],
    };
  }

  /**
   * Get aggregated performance analytics for advertiser
   */
  static async getAnalytics(userId: string, timeframe: "7d" | "30d" | "90d" = "30d") {
    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) {
      return {
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        daily: [],
      };
    }

    const days = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: campaigns } = await supabase
      .from("ad_campaigns")
      .select("id")
      .eq("advertiser_id", advertiser.id);

    const campaignIds = (campaigns || []).map((c) => c.id);
    if (campaignIds.length === 0) {
      return {
        impressions: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        daily: [],
      };
    }

    const { data: analytics } = await supabase
      .from("ad_analytics_daily")
      .select("*")
      .in("campaign_id", campaignIds)
      .gte("date", sinceDate)
      .order("date", { ascending: true });

    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalSpend = 0;

    (analytics || []).forEach((row: any) => {
      totalImpressions += Number(row.impressions || 0);
      totalReach += Number(row.reach || 0);
      totalClicks += Number(row.clicks || 0);
      totalConversions += Number(row.conversions || 0);
      totalSpend += parseFloat(row.spend || "0");
    });

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    return {
      impressions: totalImpressions,
      reach: totalReach,
      clicks: totalClicks,
      conversions: totalConversions,
      spend: parseFloat(totalSpend.toFixed(2)),
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(2)),
      cpm: parseFloat(cpm.toFixed(2)),
      daily: analytics || [],
    };
  }

  /**
   * Deposit funds directly into advertiser wallet with transactional double-entry ledger
   */
  static async depositFunds(
    userId: string,
    amount: number,
    currency?: string,
    paymentMethod?: string
  ) {
    if (!amount || amount <= 0) {
      const error: any = new Error("Deposit amount must be greater than zero.");
      error.status = 400;
      throw error;
    }

    const advertiser = await this.getAdvertiserByUserId(userId);
    if (!advertiser) {
      const error: any = new Error("Advertiser profile not found for this user.");
      error.status = 404;
      throw error;
    }

    const depositAmount = parseFloat(amount.toString());
    const currentBalance = parseFloat(advertiser.balance || "0");
    const newBalance = parseFloat((currentBalance + depositAmount).toFixed(2));
    const finalCurrency = (currency || advertiser.currency || "USD").toUpperCase();

    // 1. Update advertiser balance
    const { error: updateError } = await supabase
      .from("advertisers")
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", advertiser.id);

    if (updateError) throw updateError;

    const txId = crypto.randomUUID();
    const idempotencyKey = `dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 2. Record in payment_transactions
    try {
      await supabase.from("payment_transactions").insert({
        id: txId,
        advertiser_id: advertiser.id,
        user_id: userId,
        provider: paymentMethod || "WALLET_TOPUP",
        idempotency_key: idempotencyKey,
        amount: depositAmount,
        currency: finalCurrency,
        country: advertiser.country_code || "US",
        status: "CAPTURED",
        description: `Ad Wallet Deposit via ${paymentMethod || "Payment Portal"}`,
        metadata: { source: "ADVERTISER_PORTAL", previous_balance: currentBalance },
      });
    } catch {
      // Non-blocking
    }

    // 3. Record in payment_ledger
    try {
      await supabase.from("payment_ledger").insert({
        advertiser_id: advertiser.id,
        transaction_id: txId,
        entry_type: "CREDIT",
        amount: depositAmount,
        currency: finalCurrency,
        balance_after: newBalance,
        description: `Ad wallet deposit via ${paymentMethod || "Secure Gateway"}`,
      });
    } catch {
      // Non-blocking
    }

    // 4. Notify user
    try {
      await createNotification({
        recipientId: userId,
        type: "mention",
        message: `Your advertising wallet deposit of ${finalCurrency} ${depositAmount.toFixed(2)} was credited successfully. New balance: ${finalCurrency} ${newBalance.toFixed(2)}.`,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      balance: newBalance,
      amount: depositAmount,
      currency: finalCurrency,
      message: `Successfully deposited ${finalCurrency} ${depositAmount.toFixed(2)}.`,
    };
  }
}

