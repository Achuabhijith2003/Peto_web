import clsx from "clsx";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "amber" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const sizeStyles = {
    sm: "h-8 px-3 text-xs rounded-md gap-1.5",
    md: "h-9 px-4 text-sm rounded-lg gap-2",
    lg: "h-11 px-5 text-base rounded-lg gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-slate-950/20",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/60 shadow-xs",
    outline:
      "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs",
    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    amber:
      "bg-amber-600 text-white hover:bg-amber-700 shadow-[0_1px_2px_rgba(217,119,6,0.2)] border border-amber-700/20",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_1px_2px_rgba(225,29,72,0.2)] border border-rose-700/20",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && "w-full",
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

export default Button;