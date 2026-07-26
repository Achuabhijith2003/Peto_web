import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";

interface FeatureCardProps {
  title: string;
  description: string;
  buttonText: string;
  icon?: ReactNode;
  variant?: "blue" | "green" | "light";
  className?: string;
}

const FeatureCard = ({
  title,
  description,
  buttonText,
  icon,
  variant = "blue",
  className,
}: FeatureCardProps) => {
  const variants = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-400 text-slate-900",
    light: "bg-slate-100 text-slate-900",
  };

  return (
    <div
      className={clsx(
        "rounded-2xl p-8 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        variants[variant],
        className
      )}
    >
      {icon && <div className="mb-6">{icon}</div>}

      <h3 className="mb-3 text-3xl font-bold">
        {title}
      </h3>

      <p className="mb-8 leading-7 opacity-90">
        {description}
      </p>

      <button
        className={clsx(
          "inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold transition",
          variant === "blue"
            ? "bg-white text-blue-700"
            : "bg-white text-slate-900"
        )}
      >
        {buttonText}

        <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default FeatureCard;