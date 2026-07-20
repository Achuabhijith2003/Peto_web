import { MapPin, MoreHorizontal, Tag } from "lucide-react";

import ImageGrid from "./ImageGrid";
import PostActions from "./PostActions";
import PostStats from "./PostStats";
import CommentPreview from "./CommentPreview";

interface PostCardProps {
  avatar: string;
  user: string;
  location: string;
  time: string;
  pet: string;
  caption: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
}

const PostCard = ({
  avatar,
  user,
  location,
  time,
  pet,
  caption,
  images,
  likes,
  comments,
  shares,
}: PostCardProps) => {
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="flex items-center justify-between p-6">
        <div className="flex gap-3">
          <img
            src={avatar}
            alt={user}
            className="h-12 w-12 rounded-full object-cover"
          />

          <div>
            <h3 className="font-semibold">
              {user}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>{time}</span>

              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {location}
              </span>

              <span className="flex items-center gap-1">
                <Tag size={14} />
                {pet}
              </span>
            </div>
          </div>
        </div>

        <button>
          <MoreHorizontal />
        </button>
      </div>

      <p className="px-6 pb-5 leading-7 text-slate-700">
        {caption}
      </p>

      <ImageGrid images={images} />

      <PostStats
        likes={likes}
        comments={comments}
        shares={shares}
      />

      <div className="px-6">
        <PostActions />
      </div>

      <CommentPreview
        avatar={avatar}
        name={user}
        comment="Absolutely adorable! ❤️"
      />
    </article>
  );
};

export default PostCard;