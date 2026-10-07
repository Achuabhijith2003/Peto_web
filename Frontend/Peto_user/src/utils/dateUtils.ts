/**
 * Centralized, locale-safe date and time formatting utilities for Peto.
 * Prevents raw machine ISO timestamps (e.g. 2026-09-21T00:00:00+00:00)
 * from being displayed on user interfaces.
 */

export function formatTimeAgo(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return "Just now";
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatDate(
  dateInput?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  };

  return date.toLocaleDateString(undefined, defaultOptions);
}

export function formatShortDate(dateInput?: string | Date | null): string {
  return formatDate(dateInput, { month: "short", day: "numeric" });
}
