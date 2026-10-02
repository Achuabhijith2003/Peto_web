import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  icon?: React.ReactNode;
  variant?: "default" | "warning" | "success" | "danger" | "info" | "primary";
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  trend,
  icon,
  variant = "default",
  onClick,
  className,
}) => {
  const variantStyles = {
    default: "hover:border-border/80",
    primary: "border-primary/30 bg-primary/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
    danger: "border-destructive/30 bg-destructive/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };

  const iconBgStyles = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all duration-150 relative overflow-hidden",
        onClick && "cursor-pointer hover:shadow-xs",
        variantStyles[variant],
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </span>
          {icon && (
            <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", iconBgStyles[variant])}>
              {icon}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold tracking-tight text-foreground font-heading">
            {value}
          </div>

          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                trend.neutral
                  ? "text-muted-foreground bg-muted"
                  : trend.positive
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "text-destructive bg-destructive/10"
              )}
            >
              {trend.neutral ? (
                <Minus className="size-3" />
              ) : trend.positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
