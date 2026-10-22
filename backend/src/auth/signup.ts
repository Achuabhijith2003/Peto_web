import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase as adminSupabase } from "../config/supabase";
import { acknowledgePolicyService } from "../admin/services/adminCompliance.service";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const signup = async (req: Request, res: Response) => {
  const {
    email,
    password,
    fullName,
    full_name,
    username,
    dateOfBirth,
    date_of_birth,
    acceptedTerms,
    ageConfirmed,
    marketingConsent,
  } = req.body;

  // 1. Legal compliance: Mandatory affirmative acceptance of Terms of Service & Privacy Policy
  const hasAcceptedTerms = acceptedTerms === true || acceptedTerms === "true";
  if (!hasAcceptedTerms) {
    return res.status(400).json({
      success: false,
      message: "You must affirmatively accept Peto's Terms of Service and Privacy Policy to create an account.",
    });
  }

  // 2. Child safety & age assurance: Minimum age requirement (13+ years)
  const hasConfirmedAge = ageConfirmed === true || ageConfirmed === "true";
  if (!hasConfirmedAge) {
    return res.status(400).json({
      success: false,
      message: "You must confirm that you are at least 13 years of age (or legal age in your jurisdiction) to use Peto.",
    });
  }

  const nameToSave = fullName || full_name || username || "";
  const usernameToSave = (
    username ||
    (nameToSave ? nameToSave.toLowerCase().replace(/\s+/g, "") : "") ||
    email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "")
  ).trim();
  const acceptsMarketing = marketingConsent === true || marketingConsent === "true";
  const resolvedDob = dateOfBirth || date_of_birth || null;

  // Age verification if DOB was provided
  if (resolvedDob) {
    const birthDate = new Date(resolvedDob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13) {
      return res.status(400).json({
        success: false,
        message: "You must be at least 13 years old to register on Peto.",
      });
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nameToSave,
        fullName: nameToSave,
        username: usernameToSave,
        age_confirmed: true,
        terms_accepted_at: new Date().toISOString(),
        marketing_consent: acceptsMarketing,
        date_of_birth: resolvedDob,
      },
    },
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // 3. Immediately create/upsert the profile row in public.profiles so username is visible everywhere
  if (data.user?.id) {
    try {
      await adminSupabase.from("profiles").upsert(
        {
          id: data.user.id,
          username: usernameToSave,
          full_name: nameToSave,
          status: "ACTIVE",
          date_of_birth: resolvedDob,
          terms_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (profileErr) {
      console.warn("[Signup] Failed to insert initial profile row:", profileErr);
    }

    // 4. Record affirmative policy acknowledgements in compliance_policy_acknowledgements
    const clientIp = req.ip || req.headers["x-forwarded-for"]?.toString();
    const userAgent = req.headers["user-agent"];

    try {
      await acknowledgePolicyService(data.user.id, "terms-of-service", "1.0.0", {
        ip: clientIp,
        userAgent,
      });

      await acknowledgePolicyService(data.user.id, "privacy-policy", "1.0.0", {
        ip: clientIp,
        userAgent,
      });
    } catch (ackError) {
      console.warn("[Signup] Failed to record policy acknowledgement in audit log:", ackError);
    }
  }

  let session = data.session;
  if (!session && data.user && password) {
    try {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInData?.session) {
        session = signInData.session;
      }
    } catch (_) {}
  }

  const returnedUser = {
    ...data.user,
    id: data.user.id,
    email: data.user.email,
    username: usernameToSave,
    full_name: nameToSave,
    fullName: nameToSave,
    date_of_birth: resolvedDob,
    dateOfBirth: resolvedDob,
  };

  res.status(201).json({
    success: true,
    user: returnedUser,
    session: session,
    token: session?.access_token,
    refreshToken: session?.refresh_token,
  });
};