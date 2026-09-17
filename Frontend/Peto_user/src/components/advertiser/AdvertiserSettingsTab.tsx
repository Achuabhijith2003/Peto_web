import React, { useState } from "react";
import {
  Building2,
  AlertTriangle,
  Save,
  Shield,
  CreditCard,
  Lock,
  Eye,
} from "lucide-react";
import api from "../../utils/api";

interface Props {
  profile: any;
  app: any;
  billing?: any;
  onRefresh: () => void;
  onGoToVerification: () => void;
  displayCurrency?: string;
  onDisplayCurrencyChange?: (currency: string) => void;
}

export const AdvertiserSettingsTab: React.FC<Props> = ({
  profile,
  app,
  billing: _billing,
  onRefresh,
  onGoToVerification,
  displayCurrency = "USD",
  onDisplayCurrencyChange,
}) => {
  const [form, setForm] = useState({
    company_name: profile?.company_name || "",
    contact_name: profile?.contact_name || "",
    billing_email: profile?.contact_email || profile?.billing_email || "",
    website_url: profile?.website_url || "",
    industry: profile?.industry || "Pet Food & Nutrition",
  });
  const accountCurrency = profile?.currency || "USD";
  const [selectedDisplayCurrency, setSelectedDisplayCurrency] = useState(displayCurrency);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleDisplayCurrencySave = (newCurr: string) => {
    setSelectedDisplayCurrency(newCurr);
    if (onDisplayCurrencyChange) {
      onDisplayCurrencyChange(newCurr);
    }
    setMsg(`Display currency preference updated to ${newCurr}. Dashboard values will show approximate estimates in ${newCurr}.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await api.post("/advertisers/register", {
        company_name: form.company_name,
        companyName: form.company_name,
        contact_name: form.contact_name,
        contactName: form.contact_name,
        contact_email: form.billing_email,
        contactEmail: form.billing_email,
        website_url: form.website_url,
        websiteUrl: form.website_url,
        industry: form.industry,
      });
      setMsg("Settings saved successfully.");
      await onRefresh();
    } catch (err: any) {
      setMsg(err.response?.data?.error || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f8]">
        <div>
          <h2 className="text-xl font-headline font-bold text-[#151c27]">Advertiser Account & Profile Settings</h2>
          <p className="text-xs text-[#534434] font-medium mt-0.5">
            Manage your public business profile, contact preferences, and legal compliance parameters
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 bg-[#f0f3ff] border border-[#e2e8f8] text-[#151c27] text-xs font-semibold rounded-2xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          {msg}
        </div>
      )}

      {/* Basic Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-6 space-y-6">
        <h3 className="text-xs font-headline font-bold text-[#151c27] uppercase tracking-wider flex items-center gap-2">
          <div className="w-6 h-6 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Building2 size={15} />
          </div>
          Public Advertiser Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#151c27] font-bold mb-1.5">Company / Brand Name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-[#151c27] font-bold mb-1.5">Contact Representative</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-[#151c27] font-bold mb-1.5">Billing Notification Email</label>
            <input
              type="email"
              value={form.billing_email}
              onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-[#151c27] font-bold mb-1.5">Official Website</label>
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
            />
          </div>

          <div>
            <label className="block text-[#151c27] font-bold mb-1.5">Industry Vertical</label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
            >
              <option value="Pet Food & Nutrition">Pet Food & Nutrition</option>
              <option value="Veterinary & Health">Veterinary & Health</option>
              <option value="Pet Toys & Accessories">Pet Toys & Accessories</option>
              <option value="Grooming & Boarding">Grooming & Boarding</option>
              <option value="Training & Behavior">Training & Behavior</option>
              <option value="Animal Rescue & Non-Profit">Animal Rescue & Non-Profit</option>
              <option value="Insurance & Tech">Insurance & Tech</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-headline font-bold rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-xs flex items-center gap-2 transition"
          >
            <Save size={15} />
            <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
          </button>
        </div>
      </form>

      {/* Payment & Currency Configuration Section */}
      <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-headline font-bold text-[#151c27] uppercase tracking-wider flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-blue-500/10 text-[#0058be] flex items-center justify-center">
              <CreditCard size={15} />
            </div>
            Authoritative Billing Currency
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Lock size={11} /> Fixed for this Account
          </span>
        </div>

        <div className="p-4 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[#534434] block text-[11px]">Active Account Billing Currency</span>
            <strong className="text-base text-[#151c27] font-headline">
              {accountCurrency} ({accountCurrency === "INR" ? "₹" : accountCurrency === "EUR" ? "€" : accountCurrency === "GBP" ? "£" : "$"})
            </strong>
          </div>
          <span className="text-[11px] text-[#534434] bg-white px-3 py-1.5 rounded-xl border border-[#e2e8f8] self-start sm:self-auto font-medium">
            Permanent • Immutable
          </span>
        </div>

        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-[#855300] leading-relaxed flex items-start gap-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Warning:</strong> Your account billing currency is fixed once set and cannot be changed later. All campaign budgets, wallet top-ups, ad click/impression spend, and financial ledger statements are denominated strictly in {accountCurrency}. To view estimates in another currency, use the Display Currency preference below.
          </span>
        </div>

        {/* Display Currency Preference */}
        <div className="pt-3 border-t border-[#e2e8f8] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#151c27] flex items-center gap-1.5">
                <Eye size={13} className="text-[#0058be]" />
                Display Currency Preference (Presentation Only)
              </h4>
              <p className="text-[11px] text-[#534434] mt-0.5">
                View approximate converted balances across your dashboard. Your actual wallet and billing remain in {accountCurrency}.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#0058be] bg-[#f0f3ff] px-2 py-0.5 rounded-lg border border-[#e2e8f8]">
              Display: {selectedDisplayCurrency}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs items-end">
            <div>
              <label className="block text-[#151c27] font-bold mb-1.5">Preferred Display Currency</label>
              <select
                value={selectedDisplayCurrency}
                onChange={(e) => handleDisplayCurrencySave(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] outline-none transition font-medium"
              >
                <option value="USD">USD ($) - United States Dollar (Global)</option>
                <option value="INR">INR (₹) - Indian Rupee (India)</option>
                <option value="EUR">EUR (€) - Euro (European Union)</option>
                <option value="GBP">GBP (£) - British Pound (United Kingdom)</option>
                <option value="CAD">CAD (CA$) - Canadian Dollar (Canada)</option>
                <option value="AUD">AUD (AU$) - Australian Dollar (Australia)</option>
                <option value="SGD">SGD (SG$) - Singapore Dollar (Singapore)</option>
                <option value="AED">AED (د.إ) - UAE Dirham (United Arab Emirates)</option>
                <option value="JPY">JPY (¥) - Japanese Yen (Japan)</option>
              </select>
            </div>
            <div className="text-[11px] text-[#534434] bg-[#f0f3ff]/40 p-2.5 rounded-xl border border-[#e2e8f8]">
              Conversions are calculated dynamically using real-time baseline rates without mutating any stored records.
            </div>
          </div>
        </div>
      </div>

      {/* Verified Legal Identity Section (Protected) */}
      <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-headline font-bold text-[#151c27] uppercase tracking-wider flex items-center gap-2">
            <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Shield size={15} />
            </div>
            Verified Legal Identity & Compliance
          </h3>
          <button
            onClick={onGoToVerification}
            className="text-xs font-headline font-bold text-amber-600 hover:text-amber-700 hover:underline"
          >
            View Verification Status &rarr;
          </button>
        </div>

        <div className="p-4 bg-[#f0f3ff]/50 rounded-2xl border border-[#e2e8f8] text-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[#534434] font-medium">Legal Entity: </span>
            <strong className="text-[#151c27] font-semibold">
              {app?.business_legal_name || `${app?.legal_first_name || ""} ${app?.legal_last_name || ""}`.trim() || "Unverified"}
            </strong>
          </div>

          <div>
            <span className="text-[#534434] font-medium">Verification Status: </span>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#e7eefe] text-[#0058be] border border-[#0058be]/20">
              {profile?.verification_status || app?.status || "NOT_STARTED"}
            </span>
          </div>

          <div>
            <span className="text-[#534434] font-medium">Registration / Tax ID: </span>
            <span className="font-mono text-[#151c27] font-medium">
              {app?.business_tax_id_masked || app?.business_registration_number_masked || "Masked for Privacy"}
            </span>
          </div>

          <div>
            <span className="text-[#534434] font-medium">Verification Tier: </span>
            <span className="font-mono text-[#151c27] font-medium">
              {app?.verification_type || "None"}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-[#f0f3ff] border border-[#e2e8f8] rounded-2xl text-xs text-[#534434] leading-relaxed flex items-start gap-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            Notice: Verified legal identity fields cannot be modified directly. If your business entity or legal representative changes, an identity re-verification application will be required to maintain active advertising privileges.
          </span>
        </div>
      </div>
    </div>
  );
};
