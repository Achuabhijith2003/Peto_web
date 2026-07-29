import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
} from "lucide-react";

interface PostActionsProps {
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onBookmark?: () => void;
  onComment?: () => void;
}

const PostActions = ({ isLiked, isBookmarked, onLike, onBookmark, onComment }: PostActionsProps) => {
  return (
    <div className="mt-5 flex items-center justify-between border-t pt-4">
      <button 
        onClick={onLike}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 ${isLiked ? "text-red-500" : ""}`}
      >
        <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
        Like
      </button>

      <button 
        onClick={onComment}
        className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100"
      >
        <MessageCircle size={20} />
        Comment
      </button>

      <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100">
        <Send size={20} />
        Share
      </button>

      <button 
        onClick={onBookmark}
        className={`rounded-lg p-2 transition hover:bg-slate-100 ${isBookmarked ? "text-blue-500" : ""}`}
      >
        <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} />
      </button>
    </div>
  );
};

export default PostActions;