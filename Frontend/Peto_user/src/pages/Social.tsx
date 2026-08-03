import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { PawPrint, LogIn, UserPlus } from "lucide-react";

import Feed from "../components/social/Feed";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";

import MobileBottomNav from "../components/social/MobileBottomNav";

const Social = () => {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      {!user && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-3 px-4 shadow-sm border-b border-amber-400/30">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <PawPrint size={18} className="shrink-0 animate-bounce" />
              <span>
                You are viewing Peto in <strong>Guest Read-Only Mode</strong>. Sign in to like, comment, follow pet parents, and share posts!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white transition border border-white/30"
              >
                <LogIn size={13} />
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 px-3.5 py-1.5 text-xs font-bold transition shadow-sm"
              >
                <UserPlus size={13} />
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}

      <SocialLayout
        left={<LeftSidebar />}
        center={<Feed />}
        right={<RightSidebar />}
      />

      <MobileBottomNav />
    </main>
  );
};

export default Social;