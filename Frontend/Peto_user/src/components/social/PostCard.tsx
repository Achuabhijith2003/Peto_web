import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Send, Pencil, Trash2, X, Check } from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

import ImageGrid from "./ImageGrid";
import PostActions from "./PostActions";
import PostStats from "./PostStats";

interface PostCardProps {
  post: any;
}

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.viewer?.liked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.viewer?.bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.stats?.likes || 0);
  const [bookmarksCount, setBookmarksCount] = useState(post.stats?.bookmarks || 0);
  const [commentsCount, setCommentsCount] = useState(post.stats?.comments || 0);

  // Edit / Delete State
  const isOwner = post.viewer?.owner || post.author?.id === user?.id || post.user_id === user?.id;
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

  const handleLike = async () => {
    try {
      if (isLiked) {
        setIsLiked(false);
        setLikesCount((p: number) => p - 1);
        await api.delete(`/posts/${post.id}/like`);
      } else {
        setIsLiked(true);
        setLikesCount((p: number) => p + 1);
        await api.post(`/posts/${post.id}/like`);
      }
    } catch (error) {
      console.error("Like failed", error);
      setIsLiked(!isLiked);
      setLikesCount((p: number) => isLiked ? p + 1 : p - 1);
    }
  };

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        setIsBookmarked(false);
        setBookmarksCount((p: number) => p - 1);
        await api.delete(`/my/posts/${post.id}/bookmark`);
      } else {
        setIsBookmarked(true);
        setBookmarksCount((p: number) => p + 1);
        await api.post(`/my/posts/${post.id}/bookmark`);
      }
    } catch (error) {
      console.error("Bookmark failed", error);
      setIsBookmarked(!isBookmarked);
      setBookmarksCount((p: number) => isBookmarked ? p + 1 : p - 1);
    }
  };

  const handleDeletePost = async () => {
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
    if (!editText.trim()) return;
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
    Array.isArray(post.media) && post.media.length > 0 ? post.media :
    Array.isArray(post.images) && post.images.length > 0 ? post.images :
    Array.isArray(post.media_urls) && post.media_urls.length > 0 ? post.media_urls : [];

  const images: string[] = mediaList
    .map((m: any) => {
      let url = typeof m === "string" ? m : (m?.url || m?.path || m?.src);
      if (!url) return "";
      url = url.replace("/posts-images/posts-images/", "/posts-images/");
      url = url.replace("/posts-videos/posts-videos/", "/posts-videos/");
      return url;
    })
    .filter(Boolean);

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm mb-8">
      <div className="flex items-center justify-between p-6">
        <div className="flex gap-3">
          <img
            src={post.author?.avatar_url || "https://ui-avatars.com/api/?name=" + (post.author?.username || "user")}
            alt={post.author?.username}
            className="h-12 w-12 rounded-full object-cover"
          />

          <div>
            <h3 className="font-semibold">
              {post.author?.full_name || post.author?.username}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 rounded-xl bg-white shadow-lg border border-slate-100 py-1.5 z-20">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                >
                  <Pencil size={14} />
                  Edit Post
                </button>
                <button
                  onClick={handleDeletePost}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-slate-50 text-left disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deleting ? "Deleting..." : "Delete Post"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdatePost} className="px-6 pb-5 space-y-3">
          <textarea
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 p-3 text-slate-700 outline-none focus:border-blue-500 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditText(postText);
              }}
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !editText.trim()}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={14} /> {updating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : (
        postText && (
          <p className="px-6 pb-5 leading-7 text-slate-700">
            {postText}
          </p>
        )
      )}

      {images.length > 0 && <ImageGrid images={images} />}

      <PostStats
        likes={likesCount}
        comments={commentsCount}
        bookmarks={bookmarksCount}
      />

      <div className="px-6 pb-4">
        <PostActions 
          isLiked={isLiked}
          isBookmarked={isBookmarked}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onComment={toggleComments}
        />

        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <form onSubmit={handleAddComment} className="flex gap-3 items-center">
              <img
                src={user?.profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (user?.username || "user")}
                alt="Your Avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-sm outline-none focus:bg-slate-200"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>

            {loadingComments ? (
              <div className="text-center py-4 text-xs text-slate-400">Loading comments...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-3 pt-2">
                {comments.map((c: any) => {
                  const author = c.profiles || c.author;
                  return (
                    <div key={c.id} className="flex gap-3 text-sm">
                      <img
                        src={author?.avatar_url || "https://ui-avatars.com/api/?name=" + (author?.username || "user")}
                        alt={author?.username}
                        className="h-8 w-8 rounded-full object-cover mt-1"
                      />
                      <div className="flex-1 bg-slate-50 p-3 rounded-2xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs text-slate-800">
                            {author?.full_name || author?.username || "Anonymous"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed">{c.comment || c.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-slate-400">No comments yet. Be the first to comment!</div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;