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
    title: "Health & Nutrition",
    icon: HeartPulse,
  },
  {
    title: "Training",
    icon: Dumbbell,
  },
  {
    title: "Rescue & Shelter",
    icon: Shield,
  },
  {
    title: "More Categories",
    icon: MoreHorizontal,
  },
];

const CategoryPills = () => {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.title}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-micro hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <Icon size={14} className="text-slate-400" />
            <span>{item.title}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;