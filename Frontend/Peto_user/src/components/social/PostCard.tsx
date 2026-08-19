import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Clock,
  MessageCircle,
  Lock,
  Users,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

import ImageGrid from "./ImageGrid";
import PostActions from "./PostActions";
import PostStats from "./PostStats";

interface PostCardProps {
  post: any;
}

const PostCard = ({ post }: PostCardProps) => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(post.viewer?.liked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.viewer?.bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0);
  const [bookmarksCount, setBookmarksCount] = useState(post.stats?.bookmarks || 0);
  const [commentsCount, setCommentsCount] = useState(post.stats?.comments || 0);

  // Edit / Delete State
  const isOwner =
    post.viewer?.owner ||
    post.author?.id === user?.id ||
    post.user_id === user?.id ||
    post.author_id === user?.id;

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postText, setPostText] = useState(post.text || "");
  const [editText, setEditText] = useState(post.text || "");
  const [isDeleted, setIsDeleted] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const authorId = post.author?.id || post.user_id || post.author_id || post.author?.user_id;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authorId) {
      navigate(`/profile/${authorId}`);
    }
  };

  const handleCommentAuthorClick = (commentUser: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const commentAuthorId = commentUser?.id || commentUser?.user_id;
    if (commentAuthorId) {
      navigate(`/profile/${commentAuthorId}`);
    }
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

  const handleLike = async () => {
    if (!user) {
      openAuthModal("like posts");
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
    } catch (error) {
      console.error("Like failed", error);
      setIsLiked(!isLiked);
      setLikesCount((p: number) => (isLiked ? p + 1 : Math.max(0, p - 1)));
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      openAuthModal("save posts");
      return;
    }
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        setBookmarksCount((p: number) => Math.max(0, p - 1));
        await api.delete(`/my/posts/${post.id}/bookmark`);
      } else {
        setIsBookmarked(true);
        setBookmarksCount((p: number) => p + 1);
        await api.post(`/my/posts/${post.id}/bookmark`);
      }
    } catch (error) {
      console.error("Bookmark failed", error);
      setIsBookmarked(!isBookmarked);
      setBookmarksCount((p: number) => (isBookmarked ? p + 1 : Math.max(0, p - 1)));
    }
  };

  const handleDeletePost = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      setDeleting(true);
      await api.delete(`/posts/${post.id}`);
      setIsDeleted(true);
    } catch (err) {
      console.error("Failed to delete post", err);
      alert("Failed to delete post.");
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editText.trim()) return;
    try {
      setUpdating(true);
      await api.patch(`/posts/${post.id}`, { text: editText });
      setPostText(editText);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update post", err);
      alert("Failed to update post.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleComments = async () => {
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
      openAuthModal("comment on posts");
      return;
    }
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await api.post(`/posts/${post.id}/comments`, { comment: commentText });

      const fetchRes = await api.get(`/posts/${post.id}/comments`);
      setComments(fetchRes.data.comments || []);

      setCommentText("");
      setCommentsCount((p: number) => p + 1);
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (isDeleted) return null;

  const mediaList =
    Array.isArray(post.media) && post.media.length > 0
      ? post.media
      : Array.isArray(post.images) && post.images.length > 0
      ? post.images
      : Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls
      : [];

  const images = mediaList
    .map((m: any) => {
      let rawUrl = typeof m === "string" ? m : m?.url || m?.path || m?.src || "";
      if (!rawUrl) return null;
      const url = rawUrl
        .replace("/posts-images/posts-images/", "/posts-images/")
        .replace("/posts-videos/posts-videos/", "/posts-videos/");
      const type =
        (typeof m === "object" && m?.type) ||
        (/\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url) ? "video" : "image");
      return { url, type };
    })
    .filter(Boolean);

  const authorName = post.author?.full_name || post.author?.username || "Pet Lover";
  const authorUsername = post.author?.username ? `@${post.author.username}` : "";
  const avatarUrl =
    post.author?.avatar_url && post.author.avatar_url !== "null"
      ? post.author.avatar_url
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=f59e0b&color=fff`;

  return (
    <article className="group mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Post Header */}
      <div className="flex items-center justify-between p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          {/* Avatar with click to profile */}
          <div
            onClick={handleProfileClick}
            className="relative cursor-pointer transition-transform duration-200 hover:scale-105"
            title={`View ${authorName}'s profile`}
          >
            <img
              src={avatarUrl}
              alt={authorName}
              className="h-12 w-12 rounded-full border border-slate-200/80 object-cover shadow-sm ring-2 ring-transparent transition-all hover:ring-amber-400"
            />
          </div>

          {/* Author info with click to profile */}
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                onClick={handleProfileClick}
                className="cursor-pointer font-bold text-slate-900 transition-colors hover:text-amber-600 text-base leading-tight"
                title={`View ${authorName}'s profile`}
              >
                {authorName}
              </h3>
              {post.author?.verified && (
                <CheckCircle2 size={16} className="shrink-0 text-amber-500 fill-amber-100" />
              )}
              {post.community && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/community/${post.community.slug || post.community.id}`);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition border border-amber-200/60"
                  title={`Posted in ${post.community.name}`}
                >
                  <Users size={11} className="shrink-0" />
                  <span>c/{post.community.name}</span>
                </button>
              )}
              {post.is_locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200" title="Discussion is locked">
                  <Lock size={10} className="shrink-0" />
                  <span>Locked</span>
                </span>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              {authorUsername && (
                <span
                  onClick={handleProfileClick}
                  className="cursor-pointer transition-colors hover:text-slate-600 font-medium"
                >
                  {authorUsername}
                </span>
              )}
              {authorUsername && <span>•</span>}
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {formatTimeAgo(post.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Toggle for Post Owner */}
        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
              aria-label="Post Options"
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 z-30 w-40 overflow-hidden rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700 text-left"
                >
                  <Pencil size={15} className="text-amber-500" />
                  Edit Post
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 text-left disabled:opacity-50"
                >
                  <Trash2 size={15} className="text-rose-500" />
                  {deleting ? "Deleting..." : "Delete Post"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Text / Editing Form */}
      {isEditing ? (
        <form onSubmit={handleUpdatePost} className="px-6 pb-5 space-y-3">
          <textarea
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full rounded-2xl border border-amber-300 p-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-200 transition"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditText(postText);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !editText.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 shadow-sm transition disabled:opacity-50"
            >
              <Check size={14} /> {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        postText && (
          <p className="px-6 pb-4 text-[15px] leading-relaxed text-slate-800 font-normal whitespace-pre-line">
            {postText}
          </p>
        )
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="overflow-hidden">
          <ImageGrid images={images} />
        </div>
      )}

      {/* Post Stats */}
      <PostStats
        likes={likesCount}
        comments={commentsCount}
        bookmarks={bookmarksCount}
      />

      {/* Post Actions & Comments Drawer */}
      <div className="px-6 pb-4 pt-1">
        <PostActions
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onComment={toggleComments}
        />

        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-3 items-center">
              <img
                src={
                  user?.profile?.avatar_url ||
                  user?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || "user")}&background=f59e0b&color=fff`
                }
                alt="Your Avatar"
                className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full rounded-2xl bg-slate-100/80 px-4 py-2.5 pr-10 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-amber-200 border border-transparent focus:border-amber-300 transition-all"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-white transition hover:bg-amber-600 disabled:opacity-40"
                  aria-label="Send Comment"
                >
                  <Send size={13} />
                </button>
              </div>
            </form>

            {/* Comments List */}
            {loadingComments ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <MessageCircle size={14} className="animate-bounce text-amber-500" />
                <span>Loading comments...</span>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 pt-1">
                {comments.map((c: any) => {
                  const author = c.profiles || c.author || c.user;
                  const cAuthorName = author?.full_name || author?.username || "Pet Lover";
                  const cAvatar =
                    author?.avatar_url && author.avatar_url !== "null"
                      ? author.avatar_url
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(cAuthorName)}&background=f59e0b&color=fff`;

                  return (
                    <div key={c.id} className="flex gap-3 text-xs group/comment">
                      <img
                        onClick={(e) => handleCommentAuthorClick(author, e)}
                        src={cAvatar}
                        alt={cAuthorName}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition mt-0.5"
                        title={`View ${cAuthorName}'s profile`}
                      />
                      <div className="flex-1 rounded-2xl bg-slate-50 p-3 border border-slate-100/60 hover:bg-slate-100/60 transition">
                        <div className="flex justify-between items-center mb-1">
                          <span
                            onClick={(e) => handleCommentAuthorClick(author, e)}
                            className="font-bold text-slate-900 hover:text-amber-600 cursor-pointer transition"
                            title={`View ${cAuthorName}'s profile`}
                          >
                            {cAuthorName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(c.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed font-normal">
                          {c.comment || c.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                No comments yet. Be the first to start the conversation!
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;