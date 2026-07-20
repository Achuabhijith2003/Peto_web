import {
  Heart,
//   MessageCircle,
//   Repeat2,
} from "lucide-react";

interface PostStatsProps {
  likes: number;
  comments: number;
  shares: number;
}

const PostStats = ({
  likes,
  comments,
  shares,
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

      <div>{shares} Shares</div>
    </div>
  );
};

export default PostStats;