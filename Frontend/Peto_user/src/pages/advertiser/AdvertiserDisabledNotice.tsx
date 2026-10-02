import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MegaphoneOff, Home, ShieldCheck, CheckCircle2 } from "lucide-react";

export const AdvertiserDisabledNotice: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#0058be] selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0058be]/8 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#855300]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated Hero Graphic */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#0058be] to-[#2170e4] p-0.5 shadow-xl shadow-[#0058be]/20">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#0058be]/5"></div>
              <MegaphoneOff className="w-11 h-11 text-[#0058be]" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border-2 border-white">
            Paused
          </div>
        </motion.div>

        {/* Status Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold tracking-wide border border-amber-200">
            <span>Marketplace Temporarily Unavailable</span>
          </span>
        </div>

        {/* Headings */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-2xl sm:text-3xl font-bold font-['Quicksand'] tracking-tight text-[#151c27] mb-3"
        >
          Peto Ads Marketplace is currently unavailable
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xs sm:text-sm text-[#534434] leading-relaxed max-w-md mx-auto mb-6"
        >
          Peto's first-party advertiser marketplace is temporarily paused for this release.
          All advertiser data, historical campaigns, and billing records remain fully preserved.
        </motion.p>

        {/* Preservation confirmation card */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl border border-[#e2e8f8] p-4 text-left shadow-sm mb-6 space-y-2 text-xs text-[#534434]"
        >
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 size={16} />
            <span>Platform Features Remaining Fully Active:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] list-disc list-inside text-[#151c27]">
            <li><strong>Person Verification</strong> & Blue Verified Badge</li>
            <li><strong>Business Profiles & Verification</strong> with Yellow Verified Badge</li>
            <li>Business post creation, comments, likes, saves & discovery</li>
          </ul>
        </motion.div>

        {/* Navigation Action Buttons */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0058be] hover:bg-[#2170e4] text-white font-semibold text-xs transition shadow-md cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Feed</span>
          </Link>
          <Link
            to="/settings"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-[#f0f3ff] text-[#151c27] font-semibold text-xs border border-[#dae2f3] transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#0058be]" />
            <span>Identity & Verification Settings</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvertiserDisabledNotice;
