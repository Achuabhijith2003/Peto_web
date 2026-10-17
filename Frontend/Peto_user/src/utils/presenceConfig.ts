/**
 * Peto - Presence Configuration
 *
 * Controls whether real-time presence heartbeats and Active Pals widgets are enabled.
 * Default: DISABLED (false) to minimize Supabase database operations on the free plan.
 *
 * To re-enable in the future:
 * Set VITE_PRESENCE_ENABLED=true in the environment.
 */

export function isPresenceEnabled(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_PRESENCE_ENABLED === "true";
  }
  return false;
}
