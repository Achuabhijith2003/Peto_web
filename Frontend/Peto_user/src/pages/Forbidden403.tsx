import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, Home, LogIn, Mail } from "lucide-react";

export const Forbidden403: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#ba1a1a] selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#ba1a1a]/8 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#855300]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated 403 Hero Graphic */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#ba1a1a] to-[#ff897d] p-0.5 shadow-xl shadow-[#ba1a1a]/20">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#ba1a1a]/5"></div>
              <ShieldAlert className="w-11 h-11 text-[#ba1a1a]" />
            </div>
          </div>
          {/* Badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#ba1a1a] text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border-2 border-white">
            403
          </div>
        </motion.div>

        {/* Status Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffdad6] text-[#93000a] text-xs font-semibold tracking-wide">
            <span>Restricted Access Area • HTTP 403</span>
          </span>
        </div>

        {/* Headings */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-bold font-['Quicksand'] tracking-tight text-[#151c27] mb-3"
        >
          Off-Limits Territory!
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm sm:text-base text-[#534434] leading-relaxed max-w-md mx-auto mb-8"
        >
          You don't have authorization to view this protected pet sanctuary. If your account was suspended or flagged by moderation, you may file an appeal.
        </motion.p>

        {/* Action Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-sm mb-6 text-left space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/login"
              className="py-2.5 px-4 rounded-xl bg-[#0058be] hover:bg-[#2170e4] active:bg-[#00479b] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In Again</span>
            </Link>

            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] font-semibold text-xs border border-[#dae2f3] transition-all flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4 text-[#0058be]" />
              <span>Return Home</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-[#e2e8f8] text-center">
            <a
              href="mailto:appeals@peto.com"
              className="inline-flex items-center space-x-1.5 text-xs text-[#0058be] hover:underline font-semibold"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Moderation Appeals</span>
            </a>
          </div>
        </motion.div>

        {/* Footer Support */}
        <p className="text-xs text-[#534434]/70">
          Security policy enforced by Peto Trust & Safety.
        </p>
      </div>
    </div>
  );
};

export default Forbidden403;
