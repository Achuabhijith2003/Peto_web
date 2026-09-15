import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench, RefreshCw, Clock, ShieldCheck, ArrowRight, Heart } from "lucide-react";
import axios from "axios";

interface Maintenance503Props {
  message?: string;
  onResolved?: () => void;
}

export const Maintenance503: React.FC<Maintenance503Props> = ({
  message = "Peto is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your pet's social experience. We'll be back shortly!",
  onResolved,
}) => {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const checkStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || "/api";
      // Health check endpoint is always permitted through maintenance middleware
      const healthUrl = apiBase.replace(/\/api\/?$/, "") + "/health";
      const res = await axios.get(healthUrl, { timeout: 8000 });

      if (res.data?.maintenance === false || res.data?.status === "OK") {
        setStatusMessage("Maintenance is complete! Redirecting...");
        setTimeout(() => {
          if (onResolved) {
            onResolved();
          } else {
            window.location.href = "/";
          }
        }, 1200);
      } else {
        setStatusMessage("Peto is still in maintenance mode. We're putting the finishing touches!");
      }
    } catch {
      setStatusMessage("System is still undergoing updates. Please check back shortly.");
    } finally {
      setChecking(false);
    }
  };

  // Auto-check countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkStatus();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#f59e0b] selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f59e0b]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0058be]/8 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated Badge & Hero Graphic */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#f59e0b] to-[#ffb95f] p-0.5 shadow-xl shadow-[#f59e0b]/20">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#f59e0b]/5"></div>
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wrench className="w-11 h-11 text-[#855300]" />
              </motion.div>
            </div>
          </div>
          {/* Heart/Paw floating pill */}
          <div className="absolute -bottom-2 -right-2 bg-[#855300] text-white p-2 rounded-xl shadow-md border-2 border-white">
            <Heart className="w-4 h-4 fill-white" />
          </div>
        </motion.div>

        {/* Status Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffddb8] text-[#613b00] text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#855300] animate-ping"></span>
            <span>Controlled Maintenance Mode • HTTP 503</span>
          </span>
        </div>

        {/* Headings */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-bold font-['Quicksand'] tracking-tight text-[#151c27] mb-3"
        >
          We're Taking a Quick Paws
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm sm:text-base text-[#534434] leading-relaxed max-w-md mx-auto mb-8"
        >
          {message}
        </motion.p>

        {/* Interactive Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-sm mb-6 text-left space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f8]">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#855300]" />
              <span className="text-xs font-semibold text-[#151c27]">Auto-Check In</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#855300] bg-[#ffddb8]/60 px-2 py-0.5 rounded-md">
              {countdown}s
            </span>
          </div>

          <p className="text-xs text-[#534434] leading-relaxed">
            Our engineering team is fine-tuning the platform. All pet data, profiles, and media are safe and securely protected.
          </p>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs font-medium text-[#0058be] flex items-center space-x-2 animate-in fade-in duration-200">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={checkStatus}
              disabled={checking}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#855300] hover:bg-[#653e00] active:bg-[#4d2f00] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Verifying Status..." : "Check Status Now"}</span>
            </button>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] font-semibold text-xs border border-[#dae2f3] transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Platform Updates</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* Footer Note */}
        <p className="text-xs text-[#534434]/70">
          Need urgent help? Reach out to{" "}
          <a href="mailto:support@peto.com" className="text-[#0058be] font-semibold hover:underline">
            support@peto.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default Maintenance503;
