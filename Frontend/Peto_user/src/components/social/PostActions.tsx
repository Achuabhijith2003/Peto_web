import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Check,
} from "lucide-react";

interface PostActionsProps {
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

const PostActions = ({
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onComment,
  onShare,
}: PostActionsProps) => {
  const [copied, setCopied] = useState(false);

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onLike}
          className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
            isLiked
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Heart
            size={18}
            className={`transition-transform group-hover:scale-110 ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-slate-500"
            }`}
          />
          <span>{isLiked ? "Liked" : "Like"}</span>
        </button>

        <button
          onClick={onComment}
          className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
        >
          <MessageCircle
            size={18}
            className="text-slate-500 transition-transform group-hover:scale-110"
          />
          <span>Comment</span>
        </button>

        <button
          onClick={handleShareClick}
          className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
        >
          {copied ? (
            <>
              <Check size={18} className="text-emerald-600" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Share2
                size={18}
                className="text-slate-500 transition-transform group-hover:scale-110"
              />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      <button
        onClick={onBookmark}
        className={`group flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
          isBookmarked
            ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
        title={isBookmarked ? "Remove Bookmark" : "Save Post"}
      >
        <Bookmark
          size={18}
          className={`transition-transform group-hover:scale-110 ${
            isBookmarked ? "fill-amber-500 text-amber-500" : "text-slate-500"
          }`}
        />
      </button>
    </div>
  );
};

export default PostActions;