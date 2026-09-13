import { supabase } from "../config/supabase";

export interface CreateUserReportInput {
  reporterId: string;
  targetType: "post" | "reel" | "comment" | "user" | "community";
  targetId: string;
  reason: string;
  description?: string;
}

export const VALID_REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "sexual_content",
  "animal_abuse",
  "scam_fraud",
  "illegal_content",
  "copyright",
  "misinformation",
  "other",
];

export async function createUserReportService(input: CreateUserReportInput) {
  const { reporterId, targetType, targetId, reason, description = "" } = input;

  // 1. Basic validation
  if (!reporterId || !targetType || !targetId || !reason) {
    throw new Error("Missing required report fields (targetType, targetId, reason).");
  }

  const normalizedReason = reason.trim().toLowerCase();
  const cleanDescription = description.trim();

  // 2. Validate target existence & prevent self-reporting
  let targetAuthorId: string | null = null;
  let priority = "MEDIUM";

  // Critical safety triggers raise default priority
  if (["violence", "animal_abuse", "sexual_content"].includes(normalizedReason)) {
    priority = "HIGH";
  }

  if (targetType === "post" || targetType === "reel") {
    const { data: post, error } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (error || !post) {
      const err = new Error("The specified post or reel does not exist or was already removed.");
      (err as any).statusCode = 404;
      throw err;
    }

    targetAuthorId = post.user_id;
  } else if (targetType === "comment") {
    const { data: comment, error } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", targetId)
      .maybeSingle();

    if (error || !comment) {
      const err = new Error("The specified comment does not exist.");
      (err as any).statusCode = 404;
      throw err;
    }

    targetAuthorId = comment.user_id;
  } else if (targetType === "user") {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();

    if (error || !profile) {
      const err = new Error("The specified user profile does not exist.");
      (err as any).statusCode = 404;
      throw err;
    }

    targetAuthorId = profile.id;
  } else if (targetType === "community") {
    const { data: community, error } = await supabase
      .from("communities")
      .select("id, owner_id")
      .eq("id", targetId)
      .maybeSingle();

    if (error || !community) {
      const err = new Error("The specified community does not exist.");
      (err as any).statusCode = 404;
      throw err;
    }

    targetAuthorId = community.owner_id;
  }

  // Self-report prevention
  if (targetAuthorId && targetAuthorId === reporterId) {
    const err = new Error("You cannot report your own content or account.");
    (err as any).statusCode = 400;
    throw err;
  }

  // 3. Duplicate Prevention: Check if this user has already reported this target and it is still pending/under review
  const { data: existingReport } = await supabase
    .from("reports")
    .select("id, status")
    .eq("reporter_id", reporterId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("status", ["PENDING", "UNDER_REVIEW"])
    .maybeSingle();

  if (existingReport) {
    const err = new Error("You have already reported this content. Our safety and moderation team is currently reviewing it.");
    (err as any).statusCode = 409;
    throw err;
  }

  // 4. Create new report record in public.reports
  const { data: newReport, error: insertError } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason: normalizedReason,
      description: cleanDescription,
      status: "PENDING",
      priority,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[createUserReportService] Insert error:", insertError.message);
    throw new Error("Unable to record report at this time. Please try again later.");
  }

  return newReport;
}
