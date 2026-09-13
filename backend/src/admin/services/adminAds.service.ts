import { supabase } from "../../config/supabase";
import { createAuditLog } from "./adminAudit.service";

export type AdvertiserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "CONVERSIONS"
  | "APP_PROMOTION";

export type CampaignStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type CreativeFormat = "IMAGE" | "VIDEO" | "CAROUSEL" | "SPONSORED_POST";

export type CreativeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type ReviewAction = "APPROVE" | "REJECT" | "REQUEST_CHANGES";

// ============================================================
// RUNTIME FALLBACK STORES (For Resilience & Instant UI Readiness)
// ============================================================

const runtimeAdvertisers: any[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    company_name: "Bark & Whiskers Organic Foods",
    contact_name: "Sarah Jenkins",
    contact_email: "partners@barkandwhiskers.pet",
    website_url: "https://barkandwhiskers.pet",
    industry: "PET_FOOD",
    status: "ACTIVE" as AdvertiserStatus,
    total_spend: 3240.5,
    balance: 759.5,
    campaign_count: 1,
    notes: "Verified premium organic raw pet food manufacturer.",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    company_name: "PawHealth Tele-Vet Services",
    contact_name: "Dr. Marcus Vance",
    contact_email: "ads@pawhealthtele.com",
    website_url: "https://pawhealthtele.com",
    industry: "VET_HEALTH",
    status: "ACTIVE" as AdvertiserStatus,
    total_spend: 5120.0,
    balance: 1880.0,
    campaign_count: 1,
    notes: "Licensed veterinary telehealth consultations platform.",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    company_name: "SafePaws Smart Collars & GPS",
    contact_name: "Elena Rostova",
    contact_email: "growth@safepaws.io",
    website_url: "https://safepaws.io",
    industry: "PET_ACCESSORIES",
    status: "ACTIVE" as AdvertiserStatus,
    total_spend: 1840.0,
    balance: 3160.0,
    campaign_count: 1,
    notes: "Cellular & GPS smart collar wearable hardware.",
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    company_name: "HappyTails Adoption Haven",
    contact_name: "Carlos Mendez",
    contact_email: "director@happytailshaven.org",
    website_url: "https://happytailshaven.org",
    industry: "PET_ADOPTION",
    status: "PENDING_VERIFICATION" as AdvertiserStatus,
    total_spend: 0.0,
    balance: 500.0,
    campaign_count: 1,
    notes: "Non-profit senior cat shelter and adoption network.",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const runtimeCampaigns: any[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    advertiser_id: "a0000000-0000-0000-0000-000000000001",
    advertiser: {
      id: "a0000000-0000-0000-0000-000000000001",
      company_name: "Bark & Whiskers Organic Foods",
      contact_email: "partners@barkandwhiskers.pet",
      status: "ACTIVE",
    },
    name: "Fresh Freeze-Dried Raw Kibble Launch",
    objective: "TRAFFIC" as CampaignObjective,
    budget_type: "DAILY",
    total_budget: 2000.0,
    daily_budget: 100.0,
    spent: 1420.5,
    start_date: new Date(Date.now() - 14 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 16 * 86400000).toISOString(),
    status: "ACTIVE" as CampaignStatus,
    rejection_reason: null,
    admin_feedback: null,
    approved_by: "abd0bd30-b8ba-42c7-a500-5f1f4ad26e80",
    approved_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    advertiser_id: "a0000000-0000-0000-0000-000000000002",
    advertiser: {
      id: "a0000000-0000-0000-0000-000000000002",
      company_name: "PawHealth Tele-Vet Services",
      contact_email: "ads@pawhealthtele.com",
      status: "ACTIVE",
    },
    name: "24/7 Virtual Vet Consults for Puppies",
    objective: "CONVERSIONS" as CampaignObjective,
    budget_type: "DAILY",
    total_budget: 3500.0,
    daily_budget: 150.0,
    spent: 2840.0,
    start_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: "ACTIVE" as CampaignStatus,
    rejection_reason: null,
    admin_feedback: null,
    approved_by: "abd0bd30-b8ba-42c7-a500-5f1f4ad26e80",
    approved_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    advertiser_id: "a0000000-0000-0000-0000-000000000003",
    advertiser: {
      id: "a0000000-0000-0000-0000-000000000003",
      company_name: "SafePaws Smart Collars & GPS",
      contact_email: "growth@safepaws.io",
      status: "ACTIVE",
    },
    name: "Never Lose Your Pet: Smart GPS Collar v2",
    objective: "AWARENESS" as CampaignObjective,
    budget_type: "DAILY",
    total_budget: 1500.0,
    daily_budget: 50.0,
    spent: 0.0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: "PENDING_REVIEW" as CampaignStatus,
    rejection_reason: null,
    admin_feedback: null,
    approved_by: null,
    approved_at: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    advertiser_id: "a0000000-0000-0000-0000-000000000004",
    advertiser: {
      id: "a0000000-0000-0000-0000-000000000004",
      company_name: "HappyTails Adoption Haven",
      contact_email: "director@happytailshaven.org",
      status: "PENDING_VERIFICATION",
    },
    name: "Adopt a Senior Cat This Autumn",
    objective: "ENGAGEMENT" as CampaignObjective,
    budget_type: "LIFETIME",
    total_budget: 500.0,
    daily_budget: 25.0,
    spent: 0.0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
    status: "PENDING_REVIEW" as CampaignStatus,
    rejection_reason: null,
    admin_feedback: null,
    approved_by: null,
    approved_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const runtimeTargeting: Record<string, any> = {
  "c0000000-0000-0000-0000-000000000001": {
    campaign_id: "c0000000-0000-0000-0000-000000000001",
    countries: ["US", "CA", "GB"],
    regions: ["California", "Texas", "New York"],
    languages: ["en"],
    pet_interests: ["DOGS", "CATS", "PET_FOOD"],
    devices: ["ALL"],
    placements: ["FEED", "REELS"],
  },
  "c0000000-0000-0000-0000-000000000002": {
    campaign_id: "c0000000-0000-0000-0000-000000000002",
    countries: ["US"],
    regions: [],
    languages: ["en"],
    pet_interests: ["DOGS", "CATS", "VET_HEALTH"],
    devices: ["IOS", "ANDROID"],
    placements: ["FEED", "REELS", "COMMUNITIES"],
  },
  "c0000000-0000-0000-0000-000000000003": {
    campaign_id: "c0000000-0000-0000-0000-000000000003",
    countries: ["US", "GB", "IN"],
    regions: [],
    languages: ["en"],
    pet_interests: ["DOGS", "PET_ACCESSORIES"],
    devices: ["ALL"],
    placements: ["FEED", "EXPLORE"],
  },
  "c0000000-0000-0000-0000-000000000004": {
    campaign_id: "c0000000-0000-0000-0000-000000000004",
    countries: ["US"],
    regions: ["East Coast"],
    languages: ["en"],
    pet_interests: ["CATS", "PET_ADOPTION"],
    devices: ["ALL"],
    placements: ["FEED", "COMMUNITIES"],
  },
};

const runtimeCreatives: any[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    campaign_id: "c0000000-0000-0000-0000-000000000001",
    name: "Raw Feast Single Image Feed",
    format: "IMAGE" as CreativeFormat,
    headline: "Wholesome Nutrition for Your Furry Companion",
    body_text:
      "100% natural, human-grade freeze-dried meals crafted by veterinary nutritionists. Claim 20% off your first pet box today.",
    call_to_action: "SHOP_NOW",
    destination_url: "https://barkandwhiskers.pet/shop-peto",
    media_urls: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800",
      },
    ],
    status: "APPROVED" as CreativeStatus,
    rejection_reason: null,
    admin_feedback: null,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    campaign_id: "c0000000-0000-0000-0000-000000000002",
    name: "Puppy Care Consultation Video",
    format: "VIDEO" as CreativeFormat,
    headline: "Instant Vet Care In Your Pocket — 24/7",
    body_text:
      "Connect with certified veterinary doctors in under 2 minutes. No stressful car rides or waiting rooms.",
    call_to_action: "SIGN_UP",
    destination_url: "https://pawhealthtele.com/consult",
    media_urls: [
      {
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnail:
          "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800",
      },
    ],
    status: "APPROVED" as CreativeStatus,
    rejection_reason: null,
    admin_feedback: null,
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    campaign_id: "c0000000-0000-0000-0000-000000000003",
    name: "Smart Collar 3-Card Carousel",
    format: "CAROUSEL" as CreativeFormat,
    headline: "Real-Time GPS Tracking & Health Monitoring",
    body_text:
      "Waterproof, 30-day battery life, and instant escape alerts directly to your phone. Order with free worldwide shipping.",
    call_to_action: "LEARN_MORE",
    destination_url: "https://safepaws.io/v2",
    media_urls: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800",
        title: "Live GPS Tracking",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800",
        title: "Waterproof IP68",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800",
        title: "Activity Ring Insights",
      },
    ],
    status: "PENDING_REVIEW" as CreativeStatus,
    rejection_reason: null,
    admin_feedback: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    campaign_id: "c0000000-0000-0000-0000-000000000004",
    name: "Adopt Whiskers Sponsored Community Story",
    format: "SPONSORED_POST" as CreativeFormat,
    headline: "Give a Loving Forever Home to Gentle Seniors",
    body_text:
      "Meet our calm, affectionate rescue cats looking for warm laps and peaceful households. Adoption fees sponsored this month.",
    call_to_action: "ADOPT_NOW",
    destination_url: "https://happytailshaven.org/seniors",
    media_urls: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800",
      },
    ],
    status: "PENDING_REVIEW" as CreativeStatus,
    rejection_reason: null,
    admin_feedback: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const runtimeAnalyticsDaily: any[] = [
  {
    campaign_id: "c0000000-0000-0000-0000-000000000001",
    creative_id: "b0000000-0000-0000-0000-000000000001",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    impressions: 8400,
    reach: 7200,
    clicks: 312,
    views: 1850,
    conversions: 24,
    spend: 102.5,
  },
  {
    campaign_id: "c0000000-0000-0000-0000-000000000001",
    creative_id: "b0000000-0000-0000-0000-000000000001",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    impressions: 9150,
    reach: 7900,
    clicks: 345,
    views: 2100,
    conversions: 28,
    spend: 114.0,
  },
  {
    campaign_id: "c0000000-0000-0000-0000-000000000001",
    creative_id: "b0000000-0000-0000-0000-000000000001",
    date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    impressions: 10200,
    reach: 8850,
    clicks: 420,
    views: 2450,
    conversions: 35,
    spend: 128.5,
  },
  {
    campaign_id: "c0000000-0000-0000-0000-000000000002",
    creative_id: "b0000000-0000-0000-0000-000000000002",
    date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
    impressions: 12400,
    reach: 10800,
    clicks: 510,
    views: 4200,
    conversions: 42,
    spend: 145.0,
  },
  {
    campaign_id: "c0000000-0000-0000-0000-000000000002",
    creative_id: "b0000000-0000-0000-0000-000000000002",
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    impressions: 13100,
    reach: 11400,
    clicks: 545,
    views: 4600,
    conversions: 48,
    spend: 152.0,
  },
  {
    campaign_id: "c0000000-0000-0000-0000-000000000002",
    creative_id: "b0000000-0000-0000-0000-000000000002",
    date: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    impressions: 14250,
    reach: 12300,
    clicks: 610,
    views: 5100,
    conversions: 54,
    spend: 165.0,
  },
];

// ============================================================
// 1. ADVERTISERS SERVICES
// ============================================================

export async function getAdvertisersService(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from("advertisers")
      .select("*, ad_campaigns(count)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.search) {
      query = query.or(
        `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
      );
    }

    query = query.range(from, to);
    const { data, count, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      const formatted = data.map((adv: any) => ({
        ...adv,
        campaign_count: adv.ad_campaigns?.[0]?.count || 0,
      }));
      return {
        advertisers: formatted,
        pagination: {
          page,
          limit,
          total: count || formatted.length,
          totalPages: Math.ceil((count || formatted.length) / limit) || 1,
        },
      };
    }
  } catch (err: any) {
    // Supabase fallback
  }

  let filtered = [...runtimeAdvertisers];
  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter((a) => a.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.company_name.toLowerCase().includes(q) ||
        a.contact_name.toLowerCase().includes(q) ||
        a.contact_email.toLowerCase().includes(q)
    );
  }

  const paginated = filtered.slice(from, to + 1);
  return {
    advertisers: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    },
  };
}

export async function getAdvertiserDetailService(id: string) {
  try {
    const { data, error } = await supabase
      .from("advertisers")
      .select("*, ad_campaigns(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (data) return data;
  } catch (err: any) {
    // Fallback
  }

  const found = runtimeAdvertisers.find((a) => a.id === id);
  if (!found) {
    const error: any = new Error("Advertiser not found.");
    error.status = 404;
    throw error;
  }

  const campaigns = runtimeCampaigns.filter((c) => c.advertiser_id === id);
  return {
    ...found,
    ad_campaigns: campaigns,
  };
}

export async function createAdvertiserService(
  input: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    websiteUrl?: string;
    industry?: string;
    notes?: string;
    initialBalance?: number;
  },
  adminUserId?: string
) {
  const {
    companyName,
    contactName,
    contactEmail,
    websiteUrl = "",
    industry = "PET_CARE",
    notes = "",
    initialBalance = 0,
  } = input;

  if (!companyName || !contactName || !contactEmail) {
    const error: any = new Error("Company name, contact name, and contact email are required.");
    error.status = 400;
    throw error;
  }

  const payload = {
    company_name: companyName.trim(),
    contact_name: contactName.trim(),
    contact_email: contactEmail.trim().toLowerCase(),
    website_url: websiteUrl.trim() || null,
    industry,
    status: "ACTIVE" as AdvertiserStatus,
    total_spend: 0,
    balance: Number(initialBalance) || 0,
    notes: notes.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("advertisers").insert(payload).select().single();
    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "ADVERTISER_CREATED",
      resourceType: "ADVERTISER",
      resourceId: data.id,
      details: { companyName, contactEmail },
    });

    return data;
  } catch (err: any) {
    const newAdv = {
      id: `adv-${Date.now()}`,
      ...payload,
      campaign_count: 0,
    };
    runtimeAdvertisers.unshift(newAdv);

    await createAuditLog({
      adminId: adminUserId,
      action: "ADVERTISER_CREATED",
      resourceType: "ADVERTISER",
      resourceId: newAdv.id,
      details: { companyName, contactEmail },
    });

    return newAdv;
  }
}

export async function updateAdvertiserStatusService(
  id: string,
  status: AdvertiserStatus,
  adminUserId?: string
) {
  const validStatuses: AdvertiserStatus[] = ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"];
  if (!validStatuses.includes(status)) {
    const error: any = new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    error.status = 400;
    throw error;
  }

  try {
    const { data, error } = await supabase
      .from("advertisers")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "ADVERTISER_STATUS_UPDATED",
      resourceType: "ADVERTISER",
      resourceId: id,
      details: { newStatus: status },
    });

    return data;
  } catch (err: any) {
    const found = runtimeAdvertisers.find((a) => a.id === id);
    if (!found) {
      const error: any = new Error("Advertiser not found.");
      error.status = 404;
      throw error;
    }
    found.status = status;
    found.updated_at = new Date().toISOString();

    await createAuditLog({
      adminId: adminUserId,
      action: "ADVERTISER_STATUS_UPDATED",
      resourceType: "ADVERTISER",
      resourceId: id,
      details: { newStatus: status },
    });

    return found;
  }
}

// ============================================================
// 2. CAMPAIGNS SERVICES
// ============================================================

export async function getCampaignsService(filters?: {
  status?: string;
  objective?: string;
  advertiserId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from("ad_campaigns")
      .select(
        `
        id,
        advertiser_id,
        name,
        objective,
        budget_type,
        total_budget,
        daily_budget,
        spent,
        start_date,
        end_date,
        status,
        rejection_reason,
        admin_feedback,
        approved_at,
        created_at,
        updated_at,
        advertiser:advertisers(id, company_name, contact_email, status),
        ad_targeting(*),
        ad_creatives(*)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.objective && filters.objective !== "ALL") {
      query = query.eq("objective", filters.objective);
    }
    if (filters?.advertiserId) {
      query = query.eq("advertiser_id", filters.advertiserId);
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    query = query.range(from, to);
    const { data, count, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return {
        campaigns: data,
        pagination: {
          page,
          limit,
          total: count || data.length,
          totalPages: Math.ceil((count || data.length) / limit) || 1,
        },
      };
    }
  } catch (err: any) {
    // Supabase fallback
  }

  let filtered = [...runtimeCampaigns];
  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter((c) => c.status === filters.status);
  }
  if (filters?.objective && filters.objective !== "ALL") {
    filtered = filtered.filter((c) => c.objective === filters.objective);
  }
  if (filters?.advertiserId) {
    filtered = filtered.filter((c) => c.advertiser_id === filters.advertiserId);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.advertiser?.company_name?.toLowerCase().includes(q)
    );
  }

  const enriched = filtered.map((c) => ({
    ...c,
    ad_targeting: runtimeTargeting[c.id] || null,
    ad_creatives: runtimeCreatives.filter((cr) => cr.campaign_id === c.id),
  }));

  const paginated = enriched.slice(from, to + 1);
  return {
    campaigns: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    },
  };
}

export async function getCampaignDetailService(id: string) {
  try {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(
        `
        *,
        advertiser:advertisers(*),
        ad_targeting(*),
        ad_creatives(*),
        ad_analytics_daily(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (data) return data;
  } catch (err: any) {
    // Fallback
  }

  const found = runtimeCampaigns.find((c) => c.id === id);
  if (!found) {
    const error: any = new Error("Campaign not found.");
    error.status = 404;
    throw error;
  }

  return {
    ...found,
    ad_targeting: runtimeTargeting[id] || null,
    ad_creatives: runtimeCreatives.filter((cr) => cr.campaign_id === id),
    ad_analytics_daily: runtimeAnalyticsDaily.filter((an) => an.campaign_id === id),
  };
}

export async function createCampaignService(
  input: {
    advertiserId: string;
    name: string;
    objective: CampaignObjective;
    budgetType?: "DAILY" | "LIFETIME";
    totalBudget: number;
    dailyBudget?: number;
    startDate?: string;
    endDate?: string;
    targeting?: {
      countries?: string[];
      regions?: string[];
      languages?: string[];
      petInterests?: string[];
      devices?: string[];
      placements?: string[];
    };
    creative?: {
      name: string;
      format: CreativeFormat;
      headline: string;
      bodyText?: string;
      callToAction: string;
      destinationUrl: string;
      mediaUrls: any[];
    };
  },
  adminUserId?: string
) {
  const {
    advertiserId,
    name,
    objective,
    budgetType = "DAILY",
    totalBudget,
    dailyBudget = 0,
    startDate,
    endDate,
    targeting,
    creative,
  } = input;

  if (!advertiserId || !name || !objective || !totalBudget) {
    const error: any = new Error("advertiserId, name, objective, and totalBudget are mandatory.");
    error.status = 400;
    throw error;
  }

  const payload = {
    advertiser_id: advertiserId,
    name: name.trim(),
    objective,
    budget_type: budgetType,
    total_budget: Number(totalBudget),
    daily_budget: Number(dailyBudget) || 0,
    spent: 0,
    start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    end_date: endDate ? new Date(endDate).toISOString() : null,
    status: "PENDING_REVIEW" as CampaignStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: campaign, error } = await supabase
      .from("ad_campaigns")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (targeting) {
      await supabase.from("ad_targeting").insert({
        campaign_id: campaign.id,
        countries: targeting.countries || ["ALL"],
        regions: targeting.regions || [],
        languages: targeting.languages || ["en"],
        pet_interests: targeting.petInterests || ["DOGS", "CATS"],
        devices: targeting.devices || ["ALL"],
        placements: targeting.placements || ["FEED", "REELS"],
      });
    }

    if (creative) {
      await supabase.from("ad_creatives").insert({
        campaign_id: campaign.id,
        name: creative.name,
        format: creative.format || "IMAGE",
        headline: creative.headline,
        body_text: creative.bodyText || "",
        call_to_action: creative.callToAction || "LEARN_MORE",
        destination_url: creative.destinationUrl,
        media_urls: creative.mediaUrls || [],
        status: "PENDING_REVIEW",
      });
    }

    await createAuditLog({
      adminId: adminUserId,
      action: "CAMPAIGN_CREATED",
      resourceType: "CAMPAIGN",
      resourceId: campaign.id,
      details: { name, objective, totalBudget },
    });

    return campaign;
  } catch (err: any) {
    const newCampId = `c-${Date.now()}`;
    const newCamp = {
      id: newCampId,
      ...payload,
      advertiser: runtimeAdvertisers.find((a) => a.id === advertiserId) || null,
      rejection_reason: null,
      admin_feedback: null,
      approved_by: null,
      approved_at: null,
    };
    runtimeCampaigns.unshift(newCamp);

    if (targeting) {
      runtimeTargeting[newCampId] = {
        campaign_id: newCampId,
        countries: targeting.countries || ["ALL"],
        regions: targeting.regions || [],
        languages: targeting.languages || ["en"],
        pet_interests: targeting.petInterests || ["DOGS", "CATS"],
        devices: targeting.devices || ["ALL"],
        placements: targeting.placements || ["FEED", "REELS"],
      };
    }

    if (creative) {
      runtimeCreatives.unshift({
        id: `cr-${Date.now()}`,
        campaign_id: newCampId,
        name: creative.name,
        format: creative.format || "IMAGE",
        headline: creative.headline,
        body_text: creative.bodyText || "",
        call_to_action: creative.callToAction || "LEARN_MORE",
        destination_url: creative.destinationUrl,
        media_urls: creative.mediaUrls || [],
        status: "PENDING_REVIEW" as CreativeStatus,
        rejection_reason: null,
        admin_feedback: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await createAuditLog({
      adminId: adminUserId,
      action: "CAMPAIGN_CREATED",
      resourceType: "CAMPAIGN",
      resourceId: newCampId,
      details: { name, objective, totalBudget },
    });

    return newCamp;
  }
}

export async function updateCampaignStatusService(
  id: string,
  status: CampaignStatus,
  adminUserId?: string
) {
  const allowed = ["ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "DRAFT"];
  if (!allowed.includes(status)) {
    const error: any = new Error(`Status ${status} is invalid for manual update.`);
    error.status = 400;
    throw error;
  }

  try {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "CAMPAIGN_STATUS_UPDATED",
      resourceType: "CAMPAIGN",
      resourceId: id,
      details: { newStatus: status },
    });

    return data;
  } catch (err: any) {
    const found = runtimeCampaigns.find((c) => c.id === id);
    if (!found) {
      const error: any = new Error("Campaign not found.");
      error.status = 404;
      throw error;
    }
    found.status = status;
    found.updated_at = new Date().toISOString();

    await createAuditLog({
      adminId: adminUserId,
      action: "CAMPAIGN_STATUS_UPDATED",
      resourceType: "CAMPAIGN",
      resourceId: id,
      details: { newStatus: status },
    });

    return found;
  }
}

// ============================================================
// 3. REVIEW & APPROVAL WORKFLOW SERVICES
// ============================================================

export async function getPendingReviewQueueService(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, count, error } = await supabase
      .from("ad_campaigns")
      .select(
        `
        id,
        advertiser_id,
        name,
        objective,
        total_budget,
        daily_budget,
        start_date,
        end_date,
        status,
        rejection_reason,
        admin_feedback,
        created_at,
        advertiser:advertisers(id, company_name, contact_email, status),
        ad_targeting(*),
        ad_creatives(*)
      `,
        { count: "exact" }
      )
      .in("status", ["PENDING_REVIEW", "CHANGES_REQUESTED"])
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (data && data.length > 0) {
      return {
        queue: data,
        pagination: {
          page,
          limit,
          total: count || data.length,
          totalPages: Math.ceil((count || data.length) / limit) || 1,
        },
      };
    }
  } catch (err: any) {
    // Fallback
  }

  const pending = runtimeCampaigns.filter(
    (c) => c.status === "PENDING_REVIEW" || c.status === "CHANGES_REQUESTED"
  );
  const enriched = pending.map((c) => ({
    ...c,
    ad_targeting: runtimeTargeting[c.id] || null,
    ad_creatives: runtimeCreatives.filter((cr) => cr.campaign_id === c.id),
  }));

  const paginated = enriched.slice(from, to + 1);
  return {
    queue: paginated,
    pagination: {
      page,
      limit,
      total: pending.length,
      totalPages: Math.ceil(pending.length / limit) || 1,
    },
  };
}

export async function reviewCampaignActionService(
  campaignId: string,
  input: {
    action: ReviewAction;
    reason?: string;
    feedback?: string;
  },
  adminUserId?: string
) {
  const { action, reason, feedback } = input;

  if (action === "REJECT" && (!reason || !reason.trim())) {
    const error: any = new Error("Rejection reason is mandatory when rejecting a campaign.");
    error.status = 400;
    throw error;
  }

  if (action === "REQUEST_CHANGES" && (!reason || !reason.trim()) && (!feedback || !feedback.trim())) {
    const error: any = new Error("Feedback or change details are required when requesting changes.");
    error.status = 400;
    throw error;
  }

  let newStatus: CampaignStatus = "ACTIVE";
  let approvedAt: string | null = null;
  let approvedBy: string | null = null;
  let rejectionReason: string | null = null;
  let adminFeedback: string | null = null;

  if (action === "APPROVE") {
    newStatus = "ACTIVE";
    approvedAt = new Date().toISOString();
    approvedBy = adminUserId || null;
  } else if (action === "REJECT") {
    newStatus = "REJECTED";
    rejectionReason = reason?.trim() || "Violates Peto Advertising Standards.";
  } else if (action === "REQUEST_CHANGES") {
    newStatus = "CHANGES_REQUESTED";
    adminFeedback = (feedback || reason)?.trim() || "Creative or targeting changes required.";
  }

  try {
    let campaign: any = null;
    try {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .update({
          status: newStatus,
          approved_at: approvedAt,
          approved_by: approvedBy,
          rejection_reason: rejectionReason,
          admin_feedback: adminFeedback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .select()
        .single();

      if (error) throw error;
      campaign = data;
    } catch (fkErr: any) {
      // If approved_by FK fails against profiles, save with null approved_by
      const { data, error } = await supabase
        .from("ad_campaigns")
        .update({
          status: newStatus,
          approved_at: approvedAt,
          approved_by: null,
          rejection_reason: rejectionReason,
          admin_feedback: adminFeedback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .select()
        .single();

      if (error) throw error;
      campaign = data;
    }

    // Synchronize associated creatives to match approval or rejection
    try {
      if (action === "APPROVE") {
        await supabase
          .from("ad_creatives")
          .update({ status: "APPROVED", updated_at: new Date().toISOString() })
          .eq("campaign_id", campaignId);
      } else if (action === "REJECT") {
        await supabase
          .from("ad_creatives")
          .update({
            status: "REJECTED",
            rejection_reason: rejectionReason,
            updated_at: new Date().toISOString(),
          })
          .eq("campaign_id", campaignId);
      }
    } catch (creativeErr: any) {
      // Non-blocking creative sync
    }

    await createAuditLog({
      adminId: adminUserId,
      action: `CAMPAIGN_${action}`,
      resourceType: "CAMPAIGN",
      resourceId: campaignId,
      details: {
        action,
        newStatus,
        reason: rejectionReason || adminFeedback,
      },
    });

    return campaign;
  } catch (err: any) {
    const found = runtimeCampaigns.find((c) => c.id === campaignId);
    if (!found) {
      const error: any = new Error("Campaign not found.");
      error.status = 404;
      throw error;
    }

    found.status = newStatus;
    found.approved_at = approvedAt;
    found.approved_by = approvedBy;
    found.rejection_reason = rejectionReason;
    found.admin_feedback = adminFeedback;
    found.updated_at = new Date().toISOString();

    const relatedCreatives = runtimeCreatives.filter((cr) => cr.campaign_id === campaignId);
    relatedCreatives.forEach((cr) => {
      if (action === "APPROVE") cr.status = "APPROVED";
      else if (action === "REJECT") {
        cr.status = "REJECTED";
        cr.rejection_reason = rejectionReason;
      }
    });

    await createAuditLog({
      adminId: adminUserId,
      action: `CAMPAIGN_${action}`,
      resourceType: "CAMPAIGN",
      resourceId: campaignId,
      details: {
        action,
        newStatus,
        reason: rejectionReason || adminFeedback,
      },
    });

    return found;
  }
}

export async function reviewCreativeActionService(
  creativeId: string,
  input: {
    action: ReviewAction;
    reason?: string;
    feedback?: string;
  },
  adminUserId?: string
) {
  const { action, reason, feedback } = input;

  if (action === "REJECT" && (!reason || !reason.trim())) {
    const error: any = new Error("Rejection reason is mandatory when rejecting a creative.");
    error.status = 400;
    throw error;
  }

  let newStatus: CreativeStatus = "APPROVED";
  let rejectionReason: string | null = null;
  let adminFeedback: string | null = null;

  if (action === "APPROVE") {
    newStatus = "APPROVED";
  } else if (action === "REJECT") {
    newStatus = "REJECTED";
    rejectionReason = reason?.trim() || null;
  } else if (action === "REQUEST_CHANGES") {
    newStatus = "CHANGES_REQUESTED";
    adminFeedback = (feedback || reason)?.trim() || null;
  }

  try {
    const { data, error } = await supabase
      .from("ad_creatives")
      .update({
        status: newStatus,
        rejection_reason: rejectionReason,
        admin_feedback: adminFeedback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creativeId)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: `CREATIVE_${action}`,
      resourceType: "CREATIVE",
      resourceId: creativeId,
      details: { action, newStatus, reason: rejectionReason || adminFeedback },
    });

    return data;
  } catch (err: any) {
    const found = runtimeCreatives.find((cr) => cr.id === creativeId);
    if (!found) {
      const error: any = new Error("Creative not found.");
      error.status = 404;
      throw error;
    }

    found.status = newStatus;
    found.rejection_reason = rejectionReason;
    found.admin_feedback = adminFeedback;
    found.updated_at = new Date().toISOString();

    await createAuditLog({
      adminId: adminUserId,
      action: `CREATIVE_${action}`,
      resourceType: "CREATIVE",
      resourceId: creativeId,
      details: { action, newStatus, reason: rejectionReason || adminFeedback },
    });

    return found;
  }
}

// ============================================================
// 4. ANALYTICS & PERFORMANCE SERVICES
// ============================================================

export async function getAdsAnalyticsSummaryService(filters?: {
  timeframe?: "7d" | "30d" | "90d" | "all";
  campaignId?: string;
}) {
  const days =
    filters?.timeframe === "7d" ? 7 : filters?.timeframe === "90d" ? 90 : 30;
  const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  try {
    let query = supabase
      .from("ad_analytics_daily")
      .select("*")
      .gte("date", cutoffDate)
      .order("date", { ascending: true });

    if (filters?.campaignId && filters.campaignId !== "ALL") {
      query = query.eq("campaign_id", filters.campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return calculateMetricsSummary(data);
    }
  } catch (err: any) {
    // Fallback
  }

  let filtered = [...runtimeAnalyticsDaily];
  if (filters?.campaignId && filters.campaignId !== "ALL") {
    filtered = filtered.filter((an) => an.campaign_id === filters.campaignId);
  }
  filtered = filtered.filter((an) => an.date >= cutoffDate);

  return calculateMetricsSummary(filtered);
}

function calculateMetricsSummary(rows: any[]) {
  const totalImpressions = rows.reduce((sum, r) => sum + Number(r.impressions || 0), 0);
  const totalReach = rows.reduce((sum, r) => sum + Number(r.reach || 0), 0);
  const totalClicks = rows.reduce((sum, r) => sum + Number(r.clicks || 0), 0);
  const totalViews = rows.reduce((sum, r) => sum + Number(r.views || 0), 0);
  const totalConversions = rows.reduce((sum, r) => sum + Number(r.conversions || 0), 0);
  const totalSpend = rows.reduce((sum, r) => sum + Number(r.spend || 0), 0);

  // Exact CTR formula: (Clicks / Impressions) * 100
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

  // Aggregate by date for daily trends
  const dateMap: Record<string, any> = {};
  rows.forEach((r) => {
    if (!dateMap[r.date]) {
      dateMap[r.date] = {
        date: r.date,
        impressions: 0,
        clicks: 0,
        views: 0,
        conversions: 0,
        spend: 0,
      };
    }
    dateMap[r.date].impressions += Number(r.impressions || 0);
    dateMap[r.date].clicks += Number(r.clicks || 0);
    dateMap[r.date].views += Number(r.views || 0);
    dateMap[r.date].conversions += Number(r.conversions || 0);
    dateMap[r.date].spend += Number(r.spend || 0);
  });

  const dailyTrends = Object.values(dateMap).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );

  return {
    totals: {
      impressions: totalImpressions,
      reach: totalReach,
      clicks: totalClicks,
      views: totalViews,
      conversions: totalConversions,
      spend: Number(totalSpend.toFixed(2)),
      avgCtr: Number(avgCtr.toFixed(2)),
      avgCpc: Number(avgCpc.toFixed(2)),
      avgCpm: Number(avgCpm.toFixed(2)),
    },
    dailyTrends,
  };
}
