import { Heart, MessageCircle, Bookmark } from "lucide-react";

interface PostStatsProps {
  likes: number;
  comments: number;
  bookmarks: number;
}

const PostStats = ({ likes, comments, bookmarks }: PostStatsProps) => {
  if (likes === 0 && comments === 0 && bookmarks === 0) return null;

  return (
    <div className="flex items-center justify-between border-y border-slate-100/80 px-6 py-2.5 bg-slate-50/50 text-xs font-medium text-slate-500">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Heart size={12} className="fill-rose-500 text-rose-500" />
        </span>
        <span>{likes} {likes === 1 ? "like" : "likes"}</span>
      </div>

      <div className="flex items-center gap-4 text-slate-500">
        <div className="flex items-center gap-1 hover:text-slate-700 transition">
          <MessageCircle size={14} className="text-slate-400" />
          <span>{comments} {comments === 1 ? "comment" : "comments"}</span>
        </div>
        <div className="flex items-center gap-1 hover:text-slate-700 transition">
          <Bookmark size={14} className="text-slate-400" />
          <span>{bookmarks} {bookmarks === 1 ? "saved" : "saves"}</span>
        </div>
      </div>
    </div>
  );
};

export default PostStats;