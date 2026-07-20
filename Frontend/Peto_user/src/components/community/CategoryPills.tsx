import {
  Dog,
  HeartPulse,
  Dumbbell,
  Shield,
  MoreHorizontal,
} from "lucide-react";

const items = [
  {
    title: "Breeds",
    icon: Dog,
  },
  {
    title: "Health",
    icon: HeartPulse,
  },
  {
    title: "Training",
    icon: Dumbbell,
  },
  {
    title: "Rescue",
    icon: Shield,
  },
  {
    title: "More",
    icon: MoreHorizontal,
  },
];

const CategoryPills = () => {
  return (
    <div className="mt-16 flex flex-wrap justify-center gap-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.title}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-sm transition hover:bg-amber-500 hover:text-white"
          >
            <Icon size={18} />

            {item.title}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;