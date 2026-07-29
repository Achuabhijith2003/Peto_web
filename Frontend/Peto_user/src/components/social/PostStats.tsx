import {
  Heart,
//   MessageCircle,
//   Repeat2,
} from "lucide-react";

interface PostStatsProps {
  likes: number;
  comments: number;
  bookmarks: number;
}

const PostStats = ({
  likes,
  comments,
  bookmarks,
}: PostStatsProps) => {
  return (
    <div className="flex items-center justify-between border-y px-6 py-3 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <Heart
          size={16}
          className="fill-red-500 text-red-500"
        />
        {likes}
      </div>

      <div>{comments} Comments</div>

      <div>{bookmarks} Bookmarks</div>
    </div>
  );
};

export default PostStats;