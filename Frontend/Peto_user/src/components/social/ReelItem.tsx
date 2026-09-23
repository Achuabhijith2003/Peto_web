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
  X,
  VideoOff,
  RefreshCw,
  Loader2,
  Maximize2,
  Minimize2,
  Flag,
  Reply,
  CornerDownRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import MentionText from "./MentionText";
import { ReportModal } from "../common/ReportModal";

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
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");

  const [isLiked, setIsLiked] = useState(post.viewer?.liked || false);
  const [likesCount, setLikesCount] = useState<number>(post.stats?.likes || 0);
  const [isBookmarked, setIsBookmarked] = useState(post.viewer?.bookmarked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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
        return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url) || url.includes("/posts-videos/");
      })
    : null;

  const rawVideoUrl =
    typeof videoMedia === "string"
      ? videoMedia
      : videoMedia?.url || videoMedia?.path || post.video_url || "";
  const videoUrl = rawVideoUrl
    .replace("/posts-videos/posts-videos/", "/posts-videos/")
    .replace("/posts-images/posts-images/", "/posts-images/");

  useEffect(() => {
    const video = videoRef.current;
    if (isActive && video && videoUrl) {
      setHasError(false);
      try {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
        }
      } catch {
        setPlaying(false);
      }
    } else if (video) {
      video.pause();
      setPlaying(false);
    }

    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
        setPlaying(false);
      } else if (!document.hidden && isActive && videoRef.current) {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (video) {
        video.pause();
      }
    };
  }, [isActive, videoUrl]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    setLoading(false);
    setHasError(false);
    const wide = video.videoWidth >= video.videoHeight;
    setIsLandscape(wide);
    setFitMode(wide ? "contain" : "cover");
  };

  const handleRetry = () => {
    setHasError(false);
    setLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

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

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const handleReplyClick = (commentId: string, authorUsername: string, parentCommentId?: string) => {
    const targetParentId = parentCommentId || commentId;
    setReplyingTo({ id: targetParentId, username: authorUsername });
    setCommentText(`@${authorUsername} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
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
      const payload: any = { comment: commentText.trim() };
      if (replyingTo) {
        payload.parent_comment_id = replyingTo.id;
      }
      await api.post(`/posts/${post.id}/comments`, payload);
      const fetchRes = await api.get(`/posts/${post.id}/comments`);
      setComments(fetchRes.data.comments || []);
      if (replyingTo) {
        setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }));
      }
      setReplyingTo(null);
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-slate-950 flex items-center justify-center snap-start overflow-hidden">
      {/* Aspect Ratio Toggle for Landscape Video */}
      {isLandscape && !hasError && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFitMode(fitMode === "contain" ? "cover" : "contain");
          }}
          className="absolute top-6 left-6 z-30 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-slate-900 transition border border-white/10 shadow-sm"
          title={fitMode === "contain" ? "Zoom to fill screen" : "Show original uncropped size"}
        >
          {fitMode === "contain" ? (
            <>
              <Maximize2 size={13} className="text-amber-400" />
              <span>Original Size</span>
            </>
          ) : (
            <>
              <Minimize2 size={13} className="text-amber-400" />
              <span>Filled</span>
            </>
          )}
        </button>
      )}

      {/* Video Element: uses direct src for reliable React reloads & object-contain for landscape */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          playsInline
          muted={muted}
          onClick={togglePlay}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setLoading(true)}
          onPlaying={() => {
            setLoading(false);
            setPlaying(true);
          }}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          className={`w-full cursor-pointer transition-all duration-200 ${
            fitMode === "contain"
              ? "h-auto max-h-full max-w-[480px] object-contain my-auto"
              : "h-full w-full max-w-[480px] object-cover"
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
          <VideoOff size={36} />
          <span className="text-xs">No video URL found</span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <Loader2 size={36} className="animate-spin text-amber-500" />
        </div>
      )}

      {/* Error / Unavailable fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white z-20 gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
            <VideoOff size={32} />
          </div>
          <p className="font-headline font-bold text-sm text-slate-200">Video temporarily unavailable</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Play / Pause Indicator overlay */}
      {!playing && !loading && !hasError && (
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

        {/* Report Reel */}
        <button
          onClick={() => {
            if (!user) {
              openAuthModal("report content");
              return;
            }
            setShowReportModal(true);
          }}
          className="group flex flex-col items-center gap-1 focus:outline-none"
          title="Report Reel"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/60 backdrop-blur-md hover:bg-rose-900/60 transition">
            <Flag size={20} className="text-white group-hover:text-rose-400 transition" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-sm">Report</span>
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
          <MentionText
            text={post.text}
            mentions={post.mentions}
            taggedPets={post.tagged_pets}
            className="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed line-clamp-3 drop-shadow-sm"
          />
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
              (() => {
                const topLevel = comments.filter((c: any) => !c.parent_comment_id);
                const repliesMap: Record<string, any[]> = {};
                comments.forEach((c: any) => {
                  if (c.parent_comment_id) {
                    if (!repliesMap[c.parent_comment_id]) {
                      repliesMap[c.parent_comment_id] = [];
                    }
                    repliesMap[c.parent_comment_id].push(c);
                  }
                });

                return topLevel.map((c: any) => {
                  const author = c.profiles || c.author || c.user;
                  const cAuthorName = author?.full_name || author?.username || "Pet Lover";
                  const cAuthorUsername = author?.username || cAuthorName;
                  const cAvatar =
                    author?.avatar_url && author.avatar_url !== "null"
                      ? author.avatar_url
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(cAuthorName)}&background=f59e0b&color=fff`;
                  const replies = repliesMap[c.id] || [];
                  const isExpanded = expandedReplies[c.id];

                  return (
                    <div key={c.id} className="space-y-2 group/comment">
                      {/* Parent Comment */}
                      <div className="flex gap-3 text-xs">
                        <img
                          src={cAvatar}
                          alt={cAuthorName}
                          className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-900">
                              {cAuthorName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatTimeAgo(c.created_at)}
                            </span>
                          </div>
                          <MentionText
                            text={c.comment || c.text}
                            mentions={c.mentions}
                            showPetChips={false}
                            className="text-slate-700 leading-relaxed font-normal"
                          />
                          <div className="flex items-center gap-3 mt-1 pt-1 border-t border-slate-200/40">
                            <button
                              type="button"
                              onClick={() => handleReplyClick(c.id, cAuthorUsername)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Reply size={11} />
                              <span>Reply</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* View Replies Toggle */}
                      {replies.length > 0 && (
                        <div className="ml-11">
                          <button
                            type="button"
                            onClick={() => toggleReplies(c.id)}
                            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 py-0.5 cursor-pointer"
                          >
                            <CornerDownRight size={12} />
                            <span>
                              {isExpanded
                                ? "Hide replies"
                                : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Nested Replies List */}
                      {replies.length > 0 && isExpanded && (
                        <div className="ml-8 sm:ml-11 border-l-2 border-amber-200/80 pl-3 space-y-2 pt-1">
                          {replies.map((reply: any) => {
                            const rAuthor = reply.profiles || reply.author || reply.user;
                            const rAuthorName = rAuthor?.full_name || rAuthor?.username || "Pet Lover";
                            const rAuthorUsername = rAuthor?.username || rAuthorName;
                            const rAvatar =
                              rAuthor?.avatar_url && rAuthor.avatar_url !== "null"
                                ? rAuthor.avatar_url
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(rAuthorName)}&background=f59e0b&color=fff`;

                            return (
                              <div key={reply.id} className="flex gap-2 text-xs">
                                <img
                                  src={rAvatar}
                                  alt={rAuthorName}
                                  className="h-7 w-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                                />
                                <div className="flex-1 rounded-2xl bg-slate-100/70 p-2 border border-slate-200/60">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="font-bold text-slate-900">
                                      {rAuthorName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formatTimeAgo(reply.created_at)}
                                    </span>
                                  </div>
                                  <MentionText
                                    text={reply.comment || reply.text}
                                    mentions={reply.mentions}
                                    showPetChips={false}
                                    className="text-slate-700 leading-relaxed font-normal"
                                  />
                                  <div className="flex items-center gap-3 mt-1 pt-1 border-t border-slate-200/40">
                                    <button
                                      type="button"
                                      onClick={() => handleReplyClick(c.id, rAuthorUsername)}
                                      className="text-[10px] font-semibold text-slate-500 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Reply size={10} />
                                      <span>Reply</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            ) : (
              <p className="text-center py-6 text-xs text-slate-400">
                No comments yet. Be the first!
              </p>
            )}
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-1.5 mb-2 text-xs text-amber-900 animate-in fade-in duration-200">
              <span className="flex items-center gap-1.5 font-medium">
                <Reply size={12} className="text-amber-600" />
                Replying to <span className="font-bold">@{replyingTo.username}</span>
              </span>
              <button
                type="button"
                onClick={cancelReply}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-amber-100 transition"
                title="Cancel reply"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            onSubmit={handleAddComment}
            className="flex gap-2 pt-2 border-t border-slate-100"
          >
            <input
              ref={commentInputRef}
              type="text"
              placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
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

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="reel"
        targetId={post.id}
        targetTitle={post.text || post.content || "Reel"}
      />
    </div>
  );
};

export default ReelItem;
