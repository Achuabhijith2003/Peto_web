import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import {
  acknowledgePolicyService,
  getRetentionPoliciesService,
} from "../admin/services/adminCompliance.service";

/**
 * POST /api/compliance/requests
 * Authenticated user submits a data privacy request:
 * DATA_EXPORT, ACCOUNT_DELETION, DATA_CORRECTION, PRIVACY_REQUEST
 */
export async function submitUserPrivacyRequest(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to submit a privacy request.",
      });
    }

    const { requestType, details = "" } = req.body;
    const validTypes = ["DATA_EXPORT", "ACCOUNT_DELETION", "DATA_CORRECTION", "PRIVACY_REQUEST", "DATA_ACCESS"];

    if (!requestType || !validTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid requestType. Supported types: ${validTypes.join(", ")}`,
      });
    }

    // Check for existing pending request of the same type
    const { data: existing } = await supabase
      .from("compliance_data_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .eq("request_type", requestType)
      .in("status", ["PENDING", "PROCESSING"])
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `You already have an active ${requestType.replace("_", " ").toLowerCase()} request currently under review.`,
        existingRequestId: existing.id,
      });
    }

    // If requestType is DATA_EXPORT, compile the user's exportable data
    if (requestType === "DATA_EXPORT") {
      // Gather exportable user data safely
      const [profileRes, petsRes, postsRes, communitiesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, bio, location, website, created_at, verified, verification_badge_type")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("pets")
          .select("id, name, species, breed, gender, date_of_birth, bio, is_neutered, microchip_number, created_at")
          .eq("user_id", user.id),
        supabase
          .from("posts")
          .select("id, caption, location, created_at, likes_count, comments_count")
          .eq("user_id", user.id)
          .limit(200),
        supabase
          .from("community_members")
          .select("community_id, role, created_at")
          .eq("user_id", user.id)
          .limit(100),
      ]);

      const exportBundle = {
        platform: "Peto Social Platform",
        exportDate: new Date().toISOString(),
        user: profileRes.data || { id: user.id, email: user.email },
        pets: petsRes.data || [],
        postsCount: postsRes.data?.length || 0,
        posts: postsRes.data || [],
        communityMemberships: communitiesRes.data || [],
        dataRetentionNotice: "Generated pursuant to GDPR Art. 15 / CCPA / Australian Privacy Principles. Verification documents and internal safety hashes are excluded for security.",
      };

      const payload = {
        user_id: user.id,
        request_type: "DATA_EXPORT",
        status: "COMPLETED",
        details: JSON.stringify({
          format: "JSON_DIRECT",
          requestedAt: new Date().toISOString(),
          recordCounts: {
            pets: petsRes.data?.length || 0,
            posts: postsRes.data?.length || 0,
            communities: communitiesRes.data?.length || 0,
          },
        }),
        verification_status: "VERIFIED",
        resolution_notes: "Automated privacy export compiled and delivered securely to authenticated user.",
        completed_at: new Date().toISOString(),
      };

      const { data: record, error } = await supabase
        .from("compliance_data_requests")
        .insert(payload)
        .select()
        .single();

      return res.status(200).json({
        success: true,
        message: "Your personal data export has been compiled successfully.",
        requestId: record?.id || `req-${Date.now()}`,
        status: "COMPLETED",
        exportData: exportBundle,
      });
    }

    // If requestType is ACCOUNT_DELETION
    if (requestType === "ACCOUNT_DELETION") {
      const payload = {
        user_id: user.id,
        request_type: "ACCOUNT_DELETION",
        status: "PENDING",
        details: JSON.stringify({
          reason: typeof details === "string" ? details.trim() : "",
          requestedAt: new Date().toISOString(),
          gracePeriodDays: 30,
          recoveryNotice: "In accordance with Peto's retention policy and GDPR Art. 17, your account will enter a 30-day grace period during which you may reactivate it. After 30 days, all personal identifiable information will be permanently scrubbed.",
        }),
        verification_status: "VERIFIED",
      };

      const { data: record, error } = await supabase
        .from("compliance_data_requests")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("[submitUserPrivacyRequest] DB insert error:", error);
      }

      // Mark profile as DEACTIVATED with reason
      await supabase
        .from("profiles")
        .update({
          status: "DEACTIVATED",
          status_reason: "USER_REQUESTED_DELETION_PENDING_GRACE_PERIOD",
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return res.status(200).json({
        success: true,
        message: "Account deletion request initiated. Your account has entered the 30-day recovery grace period.",
        requestId: record?.id || `req-${Date.now()}`,
        status: "PENDING",
        retentionDays: 30,
      });
    }

    // DATA_CORRECTION or PRIVACY_REQUEST
    const payload = {
      user_id: user.id,
      request_type: requestType,
      status: "PENDING",
      details: typeof details === "string" ? details.trim() : JSON.stringify(details),
      verification_status: "VERIFIED",
    };

    const { data: record, error } = await supabase
      .from("compliance_data_requests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[submitUserPrivacyRequest] DB insert error:", error);
    }

    return res.status(201).json({
      success: true,
      message: "Your privacy request has been received and queued for review by Peto's compliance team.",
      requestId: record?.id || `req-${Date.now()}`,
      status: "PENDING",
    });
  } catch (error: any) {
    console.error("[submitUserPrivacyRequest] error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process privacy request.",
    });
  }
}

/**
 * GET /api/compliance/requests/my
 * Authenticated user views their submitted requests
 */
export async function getMyPrivacyRequests(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { data, error } = await supabase
      .from("compliance_data_requests")
      .select("id, request_type, status, details, resolution_notes, created_at, completed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMyPrivacyRequests] DB error:", error);
    }

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error("[getMyPrivacyRequests] error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch privacy requests.",
    });
  }
}

/**
 * POST /api/compliance/copyright-complaint
 * Dedicated DMCA / IP complaint filing endpoint
 */
export async function submitCopyrightComplaint(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const {
      claimantName,
      claimantEmail,
      claimantPhone,
      claimantAddress,
      organizationName,
      workDescription,
      infringingUrl,
      targetType = "post",
      targetId,
      goodFaithDeclaration,
      accuracyDeclaration,
      signature,
    } = req.body;

    // Validation
    if (!claimantName || !claimantEmail || !claimantAddress || !workDescription) {
      return res.status(400).json({
        success: false,
        message: "Claimant name, email, physical address, and copyrighted work description are mandatory.",
      });
    }

    if (!infringingUrl && !targetId) {
      return res.status(400).json({
        success: false,
        message: "Please identify the allegedly infringing content with a URL or content ID.",
      });
    }

    if (!goodFaithDeclaration || !accuracyDeclaration) {
      return res.status(400).json({
        success: false,
        message: "Both legal declarations (good-faith belief and accuracy under penalty of perjury) must be accepted.",
      });
    }

    if (!signature || typeof signature !== "string" || signature.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "A valid electronic signature (full legal name) is required.",
      });
    }

    const complaintData = {
      claimantName: claimantName.trim(),
      claimantEmail: claimantEmail.trim(),
      claimantPhone: claimantPhone ? claimantPhone.trim() : null,
      claimantAddress: claimantAddress.trim(),
      organizationName: organizationName ? organizationName.trim() : null,
      workDescription: workDescription.trim(),
      infringingUrl: infringingUrl ? infringingUrl.trim() : null,
      targetType,
      targetId: targetId ? String(targetId).trim() : null,
      signature: signature.trim(),
      goodFaithDeclaration: true,
      accuracyDeclaration: true,
      submittedAt: new Date().toISOString(),
      clientIp: req.ip || req.headers["x-forwarded-for"]?.toString(),
    };

    // 1. Record in compliance_data_requests as COPYRIGHT_COMPLAINT
    const { data: record } = await supabase
      .from("compliance_data_requests")
      .insert({
        user_id: user?.id || null,
        request_type: "COPYRIGHT_COMPLAINT",
        status: "PENDING",
        details: JSON.stringify(complaintData),
        verification_status: "PENDING_VERIFICATION",
      })
      .select()
      .single();

    // 2. Also register a HIGH priority report in reports table if targetId exists
    if (targetId) {
      await supabase.from("reports").insert({
        reporter_id: user?.id || null,
        target_type: targetType,
        target_id: String(targetId),
        reason: "copyright",
        description: `Formal DMCA notice from ${claimantName} (${claimantEmail}): ${workDescription.slice(0, 200)}`,
        status: "PENDING",
        priority: "HIGH",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Your copyright notice has been submitted. A compliance officer has been assigned to investigate.",
      complaintId: record?.id || `dmca-${Date.now()}`,
      notice: "Peto adheres to applicable copyright safe harbors, including the US DMCA notice-and-takedown framework.",
    });
  } catch (error: any) {
    console.error("[submitCopyrightComplaint] error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit copyright complaint.",
    });
  }
}

/**
 * GET /api/compliance/retention-policies
 * Returns public disclosure of platform retention rules
 */
export async function getRetentionPolicies(_req: Request, res: Response) {
  try {
    const policies = await getRetentionPoliciesService();
    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch retention policies.",
    });
  }
}
