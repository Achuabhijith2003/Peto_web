import React from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, ArrowLeft, Shield } from "lucide-react";

const SECTION_METADATA: Record<string, { title: string; phase: number; description: string }> = {
  users: {
    title: "User Management",
    phase: 2,
    description: "Inspection of all Peto user accounts, verification badge workflows, suspensions, and bans.",
  },
  "users-verification": {
    title: "User Verification",
    phase: 2,
    description: "Review and approval queue for user identity and verified badge verification requests.",
  },
  "users-suspended": {
    title: "Suspended Users",
    phase: 2,
    description: "Catalog of temporarily suspended accounts with reasons, expiry dates, and reinstatement actions.",
  },
  "users-banned": {
    title: "Banned Users",
    phase: 2,
    description: "Permanent bans management and ban appeals queue.",
  },
  "moderation-reports": {
    title: "Content & User Reports",
    phase: 3,
    description: "Central moderation queue for community reports and platform-level flagged content.",
  },
  "moderation-queue": {
    title: "Moderation Queue",
    phase: 3,
    description: "Pending items awaiting moderator review, triage, and automated safety flags.",
  },
  "moderation-posts": {
    title: "Post Moderation",
    phase: 3,
    description: "Search, filter, lock, and take down posts violating Peto community guidelines.",
  },
  "moderation-reels": {
    title: "Reels Moderation",
    phase: 3,
    description: "Video reel content inspection, copyright flags, and visibility controls.",
  },
  "moderation-comments": {
    title: "Comment Moderation",
    phase: 3,
    description: "Toxic and abusive comment moderation and bulk purge controls.",
  },
  "moderation-communities": {
    title: "Community Moderation",
    phase: 3,
    description: "Community governance, rules auditing, archive states, and ownership transfers.",
  },
  "analytics-overview": {
    title: "Analytics Overview",
    phase: 5,
    description: "High-level platform growth metrics, daily active users, and system vitality.",
  },
  "analytics-users": {
    title: "User Growth Analytics",
    phase: 5,
    description: "Signups, user demographics, churn rates, and cohort retention charts.",
  },
  "analytics-engagement": {
    title: "Engagement Analytics",
    phase: 5,
    description: "Likes, comments, shares, bookmarks, and direct messaging activity trends.",
  },
  "analytics-content": {
    title: "Content & Reels Analytics",
    phase: 5,
    description: "Video watch time, completion rates, trending tags, and top performing creators.",
  },
  "analytics-retention": {
    title: "Retention & Cohorts",
    phase: 5,
    description: "D1, D7, D30 retention heatmaps and cohort stickiness analysis.",
  },
  "ads-advertisers": {
    title: "Advertisers Management",
    phase: 8,
    description: "Commercial advertiser profiles, billing accounts, and verified ad partners.",
  },
  "ads-campaigns": {
    title: "Ad Campaigns",
    phase: 8,
    description: "Active advertising campaigns, pacing, CPM/CPC budgets, and status.",
  },
  "ads-creatives": {
    title: "Ad Creatives",
    phase: 8,
    description: "Banner and in-feed video creatives review repository.",
  },
  "ads-approval": {
    title: "Ad Approval Queue",
    phase: 8,
    description: "Review new advertiser campaigns and approve or reject based on advertising standards.",
  },
  "compliance-policies": {
    title: "Compliance & Policies",
    phase: 7,
    description: "Terms of service, privacy policy versioning, and legal disclosure management.",
  },
  "compliance-privacy": {
    title: "Privacy Management",
    phase: 7,
    description: "User privacy settings audit and consent tracking.",
  },
  "compliance-data-requests": {
    title: "Data Requests (GDPR / CCPA)",
    phase: 7,
    description: "Automated export and 'right-to-be-forgotten' data erasure requests pipeline.",
  },
  "system-health": {
    title: "System Health & Infrastructure",
    phase: 6,
    description: "Node.js cluster health, latency graphs, error rates, and database pool status.",
  },
  "system-database": {
    title: "Database & Storage Status",
    phase: 6,
    description: "Postgres table sizes, cache hit ratios, and Supabase storage bucket capacities.",
  },
  "system-flags": {
    title: "Feature Flags",
    phase: 6,
    description: "Dynamic feature rollout toggles, beta rings, and kill-switches.",
  },
  "system-config": {
    title: "System Configuration",
    phase: 6,
    description: "Platform limits (file sizes, rate limits) and global runtime parameters.",
  },
  notifications: {
    title: "Admin Notifications",
    phase: 9,
    description: "Administrative broadcast announcements, alert routing, and escalation chains.",
  },
};

export const AdminPlaceholder: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const meta = (section && SECTION_METADATA[section]) || {
    title: "Upcoming Operational Section",
    phase: 2,
    description: "This administrative section will be incrementally integrated in an upcoming development phase.",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/10">
        <Clock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          Planned for Phase {meta.phase}
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight pt-1">
          {meta.title}
        </h1>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          {meta.description}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
        <div className="flex items-center text-slate-300 font-semibold">
          <Shield className="w-4 h-4 text-indigo-400 mr-2" />
          Phase-by-Phase Development Rule
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          In accordance with the Peto architectural mandate, the Admin Control Center is constructed incrementally. Phase 1 (Foundation, Authentication, RBAC, Permissions, Admin Management, and Audit Trail) is fully operational.
        </p>
      </div>

      <div className="pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
