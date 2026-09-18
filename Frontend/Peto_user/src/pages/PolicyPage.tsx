import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Download,
  Calendar,
  Globe,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import api from "../utils/api";
import PolicyMarkdownRenderer from "../components/common/PolicyMarkdownRenderer";
import Footer from "../components/layout/Footer";

interface PolicyItem {
  id: string;
  slug: string;
  policy_type: string;
  title: string;
  version: string;
  content: string;
  effective_date?: string;
  region_code?: string;
  published_at?: string;
}

const POLICY_LINKS = [
  { slug: "terms-of-service", label: "Terms of Service" },
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "community-guidelines", label: "Community Guidelines" },
  { slug: "content-policy", label: "Content Policy" },
  { slug: "advertising-policy", label: "Advertising Policy" },
  { slug: "cookie-policy", label: "Cookie Policy" },
];

const FALLBACK_POLICIES: Record<string, Partial<PolicyItem>> = {
  "terms-of-service": {
    title: "Terms of Service",
    version: "1.0.0",
    effective_date: "2026-09-18T00:00:00Z",
    region_code: "GLOBAL",
    content: `# Terms of Service

Welcome to Peto. By accessing or using our website, mobile application, or any Peto-affiliated services, you agree to comply with and be bound by these Terms of Service.

## 1. User Accounts & Eligibility
You must be at least 13 years of age (or the minimum age required in your jurisdiction) to create a Peto account. You are responsible for safeguarding your login credentials and for all activities that occur under your account.

## 2. Pet Health & AI Disclaimer
Peto provides AI-driven pet guidance, care tips, and community interaction for informational purposes only. Peto AI and user communications do not constitute professional veterinary advice or emergency veterinary medical diagnosis. Always seek the advice of a licensed veterinarian regarding any pet health condition.

## 3. Community Conduct & Content Standards
Peto strives to foster a safe, positive, and supportive environment for pet lovers. You agree not to post content that is unlawful, abusive, defamatory, or promotes animal cruelty, neglect, or unlawful pet trading.

## 4. Subscriptions & Digital Services
Premium Peto subscriptions and virtual veterinary consultations are billed in accordance with the fees communicated at checkout. Cancellation and refund policies apply as outlined in our Refund Policy.

## 5. Termination
We reserve the right to suspend or terminate accounts that violate these terms, compromise the safety of our users, or engage in fraudulent activities.

## 6. Contact Information
If you have any questions regarding these Terms of Service, contact legal@peto.app.`,
  },
  "privacy-policy": {
    title: "Privacy Policy",
    version: "1.0.0",
    effective_date: "2026-09-18T00:00:00Z",
    region_code: "GLOBAL",
    content: `# Privacy Policy

Peto is committed to protecting your personal information and respecting your privacy rights across all our digital platforms.

## 1. Information We Collect
We collect information you provide directly (such as your name, email address, profile picture, pet breed, and pet health logs), as well as automated device telemetry and usage information.

## 2. How We Use Information
We use collected data to deliver our pet care services, personalize content recommendations, process secure payments, enhance community safety, and improve our AI assistance models.

## 3. Data Protection & Encryption
All user data in transit is encrypted using TLS 1.3, and sensitive records in storage are protected with AES-256 encryption. We do not sell your personal data to third parties.

## 4. Your Rights (GDPR / CCPA / DPDP)
You have the right to access, rectify, export, or delete your personal information at any time. You can submit data privacy requests directly within your profile settings or by contacting privacy@peto.app.`,
  },
  "community-guidelines": {
    title: "Community Guidelines",
    version: "1.0.0",
    effective_date: "2026-09-18T00:00:00Z",
    region_code: "GLOBAL",
    content: `# Community Guidelines

Our mission is to create the friendliest and most helpful pet parent community in the world.

## 1. Kindness & Respect
Treat all pet parents, fosters, and veterinarians with respect. Constructive advice is welcome; harassment, hate speech, and shaming are strictly forbidden.

## 2. Animal Welfare First
We have zero tolerance for any content depicting or encouraging animal cruelty, illegal breeding, unsafe pet handling, or neglect.

## 3. Authentic Content
Share authentic photos and videos of your pets. Do not impersonate other accounts or spread misleading medical advice.`,
  },
};

export const PolicyPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const currentSlug = slug || "terms-of-service";

  const [policy, setPolicy] = useState<PolicyItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPolicy() {
      setLoading(true);

      try {
        const res = await api.get(`/policies/${currentSlug}`);
        if (isMounted && res.data?.data) {
          setPolicy(res.data.data);
        }
      } catch (err: any) {
        console.warn("Public policy API not reachable, falling back to local copy", err);
        // Graceful fallback to built-in copy
        const fallback = FALLBACK_POLICIES[currentSlug] || {
          title: currentSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          version: "1.0.0",
          effective_date: new Date().toISOString(),
          region_code: "GLOBAL",
          content: `# ${currentSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}\n\nThis policy document is currently being updated. Please check back shortly or reach out to legal@peto.app.`,
        };

        if (isMounted) {
          setPolicy({
            id: `local-${currentSlug}`,
            slug: currentSlug,
            policy_type: currentSlug.toUpperCase().replace(/-/g, "_"),
            title: fallback.title || "Compliance Policy",
            version: fallback.version || "1.0.0",
            content: fallback.content || "",
            effective_date: fallback.effective_date,
            region_code: fallback.region_code,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPolicy();

    return () => {
      isMounted = false;
    };
  }, [currentSlug]);

  const pdfUrl = `${api.defaults.baseURL || "/api"}/policies/${currentSlug}/pdf`;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between text-slate-800">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Return to Peto Feed"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/" className="hover:text-blue-600 font-medium">
                Peto
              </Link>
              <ChevronRight size={14} />
              <span className="text-slate-400">Compliance & Legal</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-semibold">
                {policy?.title || "Policy"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Navigation Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Peto Legal Center
              </h3>
              <nav className="space-y-1">
                {POLICY_LINKS.map((item) => {
                  const isActive = currentSlug === item.slug;
                  return (
                    <Link
                      key={item.slug}
                      to={`/policies/${item.slug}`}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <ChevronRight size={15} className="text-blue-600" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Compliance Guarantee Box */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-300">
                <ShieldCheck size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Verified Compliance
                </span>
              </div>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Peto policies are authored with strict regulatory alignment covering COPPA, GDPR, India DPDP, and global animal welfare standards.
              </p>
              <div className="pt-2 border-t border-blue-800/80 text-[11px] text-blue-300 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Audited revision records</span>
              </div>
            </div>
          </aside>

          {/* Right Document Content */}
          <section className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm">
              {loading ? (
                <div className="py-20 text-center text-slate-500 space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-medium">Loading official policy document...</p>
                </div>
              ) : policy ? (
                <article className="space-y-6">
                  {/* Document Header Card */}
                  <div className="pb-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-100">
                          v{policy.version}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Globe size={13} />
                          {policy.region_code || "GLOBAL"}
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {policy.title}
                      </h1>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
                      {policy.effective_date && (
                        <div className="flex items-center sm:justify-end gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            Effective:{" "}
                            <strong className="text-slate-700">
                              {new Date(policy.effective_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </strong>
                          </span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        Official Peto Legal Publication
                      </div>
                    </div>
                  </div>

                  {/* Rendered Markdown Body */}
                  <div className="pt-4">
                    <PolicyMarkdownRenderer content={policy.content} />
                  </div>

                  {/* Document End Signature Box */}
                  <div className="mt-12 pt-6 border-t border-slate-200 bg-slate-50/70 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        Need assistance or clarification?
                      </span>
                      <span>
                        Contact our Legal & Compliance Office at{" "}
                        <a
                          href="mailto:legal@peto.app"
                          className="text-blue-600 underline font-medium"
                        >
                          legal@peto.app
                        </a>
                      </span>
                    </div>

                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-sm transition"
                    >
                      <Download size={13} />
                      <span>Download Certified PDF</span>
                    </a>
                  </div>
                </article>
              ) : (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-800">Policy Not Found</h3>
                  <p className="text-xs">
                    The requested policy "{currentSlug}" could not be located.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PolicyPage;
