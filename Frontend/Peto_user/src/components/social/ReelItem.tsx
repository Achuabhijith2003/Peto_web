import { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Disc,
  Send,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface ReelItemProps {
  post: any;
  isActive: boolean;
}

const ReelItem = ({ post, isActive }: ReelItemProps) => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(post.viewer?.liked || false);
  const [likesCount, setLikesCount] = useState<number>(post.stats?.likes || 0);
  const [isBookmarked, setIsBookmarked] = useState(post.viewer?.bookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copied, setCopied] = useState(false);

  const author = post.author || post.profiles || {};
  const authorName = author.full_name || author.username || "Pet Lover";
  const authorUsername = author.username ? `@${author.username}` : "";
  const avatarUrl =
    author.avatar_url && author.avatar_url !== "null"
      ? author.avatar_url
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=f59e0b&color=fff`;

  // Get video URL
  const videoMedia = Array.isArray(post.media)
    ? post.media.find((m: any) => {
        if (m.type === "video") return true;
        const url = typeof m === "string" ? m : m.url || m.path || "";
        return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url);
      })
    : null;

  const rawVideoUrl = typeof videoMedia === "string" ? videoMedia : videoMedia?.url || videoMedia?.path || post.video_url || "";
  const videoUrl = rawVideoUrl
    .replace("/posts-videos/posts-videos/", "/posts-videos/")
    .replace("/posts-images/posts-images/", "/posts-images/");

  useEffect(() => {
    if (isActive && videoRef.current && videoUrl) {
      try {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
        }
      } catch {
        setPlaying(false);
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isActive, videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal("like reels");
      return;
    }
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((p: number) => Math.max(0, p - 1));
        await api.delete(`/posts/${post.id}/like`);
      } else {
        setIsLiked(true);
        setLikesCount((p: number) => p + 1);
        await api.post(`/posts/${post.id}/like`);
      }
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal("save reels");
      return;
    }
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        await api.delete(`/my/posts/${post.id}/bookmark`);
      } else {
        setIsBookmarked(true);
        await api.post(`/my/posts/${post.id}/bookmark`);
      }
    } catch (err) {
      console.error("Bookmark failed", err);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/posts/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showComments && comments.length === 0) {
      try {
        setLoadingComments(true);
        const res = await api.get(`/posts/${post.id}/comments`);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error("Failed to load comments", err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("comment on reels");
      return;
    }
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      await api.post(`/posts/${post.id}/comments`, { comment: commentText });
      const fetchRes = await api.get(`/posts/${post.id}/comments`);
      setComments(fetchRes.data.comments || []);
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-950 flex items-center justify-center snap-start overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        loop
        playsInline
        muted={muted}
        onClick={togglePlay}
        className="h-full w-full object-cover max-w-[480px] cursor-pointer"
      >
        {videoUrl && <source src={videoUrl} type="video/mp4" />}
      </video>

      {/* Play / Pause Indicator overlay */}
      {!playing && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer pointer-events-auto"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md">
            <Play size={32} className="fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Sound Mute Toggle Button */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md hover:bg-slate-900 transition"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Right Interaction Sidebar */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6 text-white">
        {/* Like */}
        <button
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition ${
              isLiked ? "bg-rose-500 text-white scale-110 shadow-lg shadow-rose-500/30" : "bg-slate-900/60 hover:bg-slate-900"
            }`}
          >
            <Heart size={24} className={isLiked ? "fill-white text-white" : "text-white"} />
          </div>
          <span className="text-xs font-bold drop-shadow-sm">{likesCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={openComments}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 transition">
            <MessageCircle size={24} className="text-white" />
          </div>
          <span className="text-xs font-bold drop-shadow-sm">{post.stats?.comments || 0}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition ${
              isBookmarked ? "bg-amber-500 text-white" : "bg-slate-900/60 hover:bg-slate-900"
            }`}
          >
            <Bookmark size={24} className={isBookmarked ? "fill-white text-white" : "text-white"} />
          </div>
          <span className="text-[10px] font-medium drop-shadow-sm">Save</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 transition">
            <Share2 size={22} className="text-white" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-sm">{copied ? "Copied!" : "Share"}</span>
        </button>

        {/* Vinyl Disc Icon */}
        <div className="mt-2 animate-spin duration-[4000ms]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 border-2 border-slate-700 text-amber-400">
            <Disc size={20} />
          </div>
        </div>
      </div>

      {/* Bottom Content Overlay */}
      <div className="absolute left-4 bottom-6 right-20 z-20 space-y-3 text-white max-w-[380px]">
        {/* Creator Info */}
        <div className="flex items-center gap-3">
          <img
            onClick={() => navigate(`/profile/${author.id}`)}
            src={avatarUrl}
            alt={authorName}
            className="h-10 w-10 rounded-full object-cover border-2 border-amber-400 cursor-pointer"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => navigate(`/profile/${author.id}`)}
                className="font-headline font-bold text-sm hover:underline cursor-pointer drop-shadow-sm"
              >
                {authorName}
              </span>
              {author.verified && (
                <CheckCircle2 size={14} className="text-amber-400 fill-amber-400/20" />
              )}
            </div>
            {authorUsername && (
              <span className="text-xs text-slate-300 font-medium">{authorUsername}</span>
            )}
          </div>
        </div>

        {/* Caption */}
        {post.text && (
          <p className="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed line-clamp-3 drop-shadow-sm">
            {post.text}
          </p>
        )}
      </div>

      {/* Slide-over Comments Drawer */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-40 max-h-[65%] rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 text-slate-900 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-headline font-bold text-base">Comments</h3>
            <button
              onClick={() => setShowComments(false)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {loadingComments ? (
              <p className="text-center py-6 text-xs text-slate-400">Loading comments...</p>
            ) : comments.length > 0 ? (
              comments.map((c: any) => (
                <div key={c.id} className="flex gap-3 text-xs">
                  <img
                    src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.profiles?.username || "user")}`}
                    alt="User"
                    className="h-8 w-8 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 rounded-2xl bg-slate-50 p-2.5">
                    <p className="font-bold text-slate-900">{c.profiles?.full_name || c.profiles?.username}</p>
                    <p className="text-slate-700 mt-0.5">{c.comment || c.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-slate-400">No comments yet. Be the first!</p>
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReelItem;
