import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Home, Users, ArrowLeft, Search } from "lucide-react";

export const NotFound404: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#0058be] selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0058be]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#f59e0b]/8 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Animated 404 Hero Visual */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative inline-flex items-center justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#0058be] to-[#2170e4] p-0.5 shadow-xl shadow-[#0058be]/20">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[#0058be]/5"></div>
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Compass className="w-11 h-11 text-[#0058be]" />
              </motion.div>
            </div>
          </div>
          {/* Badge */}
          <div className="absolute -bottom-2 -right-2 bg-[#0058be] text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border-2 border-white">
            404
          </div>
        </motion.div>

        {/* Status Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d8e2ff] text-[#001a42] text-xs font-semibold tracking-wide">
            <span>Page Missing in Action • HTTP 404</span>
          </span>
        </div>

        {/* Headings */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-3xl sm:text-4xl font-bold font-['Quicksand'] tracking-tight text-[#151c27] mb-3"
        >
          Paw-sively Lost!
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm sm:text-base text-[#534434] leading-relaxed max-w-md mx-auto mb-8"
        >
          Looks like your furry friend took a wrong turn at the fire hydrant. The page you're looking for doesn't exist or has moved.
        </motion.p>

        {/* Navigation & Search Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-sm mb-6 text-left space-y-4"
        >
          {/* Quick Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, pets, or communities..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] transition-all"
            />
            <Search className="w-4 h-4 text-[#534434]/60 absolute left-3.5 top-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1.5 rounded-lg bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Link Buttons */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl bg-[#0058be] hover:bg-[#2170e4] active:bg-[#00479b] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Back to Social Feed</span>
            </Link>

            <Link
              to="/community"
              className="py-2.5 px-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] font-semibold text-xs border border-[#dae2f3] transition-all flex items-center justify-center space-x-2"
            >
              <Users className="w-4 h-4 text-[#0058be]" />
              <span>Explore Communities</span>
            </Link>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center space-x-1.5 text-xs text-[#534434] hover:text-[#151c27] font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to previous screen</span>
            </button>
          </div>
        </motion.div>

        {/* Footer Support */}
        <p className="text-xs text-[#534434]/70">
          Think something is broken?{" "}
          <a href="mailto:support@peto.com" className="text-[#0058be] font-semibold hover:underline">
            Report a broken link
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound404;
