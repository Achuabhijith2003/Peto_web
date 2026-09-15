import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ServerCrash, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface ServerError500Props {
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

export const ServerError500: React.FC<ServerError500Props> = ({
  error,
  resetErrorBoundary,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (error?.stack || error?.message) {
      navigator.clipboard.writeText(error.stack || error.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRetry = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#ba1a1a] selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#ba1a1a]/8 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#f59e0b]/8 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated 500 Hero Graphic */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#ba1a1a] to-[#ff897d] p-0.5 shadow-xl shadow-[#ba1a1a]/20">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#ba1a1a]/5"></div>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ServerCrash className="w-11 h-11 text-[#ba1a1a]" />
              </motion.div>
            </div>
          </div>
          {/* Badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#ba1a1a] text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border-2 border-white">
            500
          </div>
        </motion.div>

        {/* Status Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffdad6] text-[#93000a] text-xs font-semibold tracking-wide">
            <span>Unexpected Server Hiccup • HTTP 500</span>
          </span>
        </div>

        {/* Headings */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-bold font-['Quicksand'] tracking-tight text-[#151c27] mb-3"
        >
          Something Barked on Our End
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm sm:text-base text-[#534434] leading-relaxed max-w-md mx-auto mb-8"
        >
          Our servers ran into an unexpected snag while fetching your pet content. Our automated monitoring has logged this incident.
        </motion.p>

        {/* Action Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-sm mb-6 text-left space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleRetry}
              className="py-2.5 px-4 rounded-xl bg-[#0058be] hover:bg-[#2170e4] active:bg-[#00479b] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>

            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] font-semibold text-xs border border-[#dae2f3] transition-all flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4 text-[#0058be]" />
              <span>Go to Home</span>
            </Link>
          </div>

          {/* Diagnostic Details */}
          {error && (
            <div className="pt-2 border-t border-[#e2e8f8]">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-xs text-[#534434] hover:text-[#ba1a1a] transition-colors py-1 cursor-pointer"
              >
                <span className="font-semibold">Diagnostic Technical Info</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#151c27] text-[#ebf1ff] font-mono text-[11px] leading-relaxed relative overflow-x-auto max-h-48">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/10">
                    <span className="text-amber-400 font-bold">{error.name || "Error"}</span>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center space-x-1 text-slate-300 hover:text-white transition-colors text-[10px]"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy Log"}</span>
                    </button>
                  </div>
                  <p className="text-rose-300 font-semibold mb-1">{error.message}</p>
                  {error.stack && (
                    <pre className="text-slate-400 text-[10px] whitespace-pre-wrap">{error.stack}</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer Support */}
        <p className="text-xs text-[#534434]/70">
          Persistent issue? Contact our site reliability team at{" "}
          <a href="mailto:support@peto.com" className="text-[#0058be] font-semibold hover:underline">
            support@peto.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default ServerError500;
