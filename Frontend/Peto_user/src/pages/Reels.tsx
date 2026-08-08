import { useState, useEffect, useRef } from "react";
import { Loader2, Clapperboard, RefreshCw } from "lucide-react";
import api from "../utils/api";
import ReelItem from "../components/social/ReelItem";
import Navbar from "../components/layout/Navbar";
import MobileBottomNav from "../components/social/MobileBottomNav";

const Reels = () => {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const res = await api.get("/posts/reels");
      if (res.data?.success) {
        setReels(res.data.posts || []);
      }
    } catch (err) {
      console.error("Error fetching reels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const height = container.clientHeight;
    const index = Math.round(container.scrollTop / height);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 flex justify-center items-center relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-amber-500 py-20">
            <Loader2 size={36} className="animate-spin" />
            <p className="font-headline font-bold text-sm text-slate-300">Loading Pet Reels...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center px-4 py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clapperboard size={36} />
            </div>
            <h2 className="font-headline font-bold text-xl text-white">No Reels Yet</h2>
            <p className="text-sm text-slate-400 max-w-sm">
              Be the first pet parent to upload a fun video clip! Use the Create Post button on the home feed.
            </p>
            <button
              onClick={fetchReels}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-amber-600 transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full max-w-[480px] h-[calc(100vh-5rem)] snap-y snap-mandatory overflow-y-scroll scrollbar-none relative"
          >
            {reels.map((post, idx) => (
              <div key={post.id || idx} className="h-full w-full snap-start">
                <ReelItem post={post} isActive={idx === activeIndex} />
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Reels;
