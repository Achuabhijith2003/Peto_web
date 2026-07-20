interface CircleCardProps {
  image: string;
  title: string;
  members: string;
  badge?: string;
  tags: string[];
}

const CircleCard = ({
  image,
  title,
  members,
  badge,
  tags,
}: CircleCardProps) => {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="relative">
        <img
          src={image}
          alt={title}
          className="h-52 w-full object-cover"
        />

        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            👥 {members} members
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        <button className="w-full rounded-xl bg-amber-500 py-3 font-medium text-white transition hover:bg-amber-600">
          Join Circle
        </button>
      </div>
    </div>
  );
};

export default CircleCard;