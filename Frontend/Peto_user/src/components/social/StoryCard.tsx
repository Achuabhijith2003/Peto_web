interface StoryCardProps {
  image: string;
  avatar: string;
  name: string;
}

const StoryCard = ({
  image,
  avatar,
  name,
}: StoryCardProps) => {
  return (
    <div className="relative h-52 min-w-[130px] cursor-pointer overflow-hidden rounded-2xl shadow-md transition duration-300 hover:scale-105">
      <img
        src={image}
        alt={name}
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

      <img
        src={avatar}
        alt={name}
        className="absolute left-3 top-3 h-12 w-12 rounded-full border-4 border-blue-500 object-cover"
      />

      <span className="absolute bottom-4 left-3 text-sm font-semibold text-white">
        {name}
      </span>
    </div>
  );
};

export default StoryCard;