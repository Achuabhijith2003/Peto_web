import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";

interface CommunityCardProps {
  image: string;
  avatar: string;
  user: string;
  location: string;
  caption: string;
  likes: number;
  comments: number;
}

const CommunityCard = ({
  image,
  avatar,
  user,
  location,
  caption,
  likes,
  comments,
}: CommunityCardProps) => {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <img
        src={image}
        alt={caption}
        className="h-72 w-full object-cover"
      />

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <img
            src={avatar}
            alt={user}
            className="h-12 w-12 rounded-full object-cover"
          />

          <div>
            <h4 className="font-semibold">
              {user}
            </h4>

            <p className="text-sm text-slate-500">
              {location}
            </p>
          </div>
        </div>

        <p className="mb-5 text-slate-600">
          {caption}
        </p>

        <div className="flex items-center justify-between border-t pt-4">
          <button className="flex items-center gap-2 text-slate-600 hover:text-red-500">
            <Heart size={18} />

            {likes}
          </button>

          <button className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
            <MessageCircle size={18} />

            {comments}
          </button>

          <button className="hover:text-blue-600">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;