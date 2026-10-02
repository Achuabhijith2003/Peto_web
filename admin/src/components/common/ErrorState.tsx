import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Failed to load data",
  message = "An error occurred while communicating with the administrative API.",
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-destructive/20 bg-destructive/5",
        className
      )}
    >
      <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-destructive">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-md leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 gap-1.5">
          <RotateCcw className="size-3.5" />
          Retry Request
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
