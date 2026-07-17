// import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

const Button = ({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      {...props}
      className={clsx(
        "w-full rounded-xl py-3 font-semibold transition-all duration-300",
        "hover:scale-[1.02] active:scale-95",
        variant === "primary"
          ? "bg-amber-500 text-white hover:bg-amber-600"
          : "border border-blue-600 text-blue-600 hover:bg-blue-50",
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;