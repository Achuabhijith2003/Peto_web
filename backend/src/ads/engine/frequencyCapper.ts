import { AdRequestContext } from "./adDecisionEngine.types";

// User session sliding window (User ID -> last served timestamp)
const userLastAdTimes: Map<string, number> = new Map();

// Configuration defaults (can be overridden by system settings)
export const FREQUENCY_CONFIG = {
  minContentBetweenAds: 5,
  minTimeSecondsBetweenAds: 45, // at least 45 seconds between ads for same user
};

export class FrequencyCapper {
  /**
   * Determine whether the current request is eligible to receive an advertisement
   */
  static isEligible(context: AdRequestContext): { eligible: boolean; reason?: string } {
    // 1. Spacing check: Organic content count between sponsored cards
    if (
      context.organicCountSinceLastAd !== undefined &&
      context.organicCountSinceLastAd < FREQUENCY_CONFIG.minContentBetweenAds
    ) {
      return {
        eligible: false,
        reason: `Content spacing threshold not met (${context.organicCountSinceLastAd}/${FREQUENCY_CONFIG.minContentBetweenAds})`,
      };
    }

    // 2. Cooldown check: Time since last ad served to this user
    if (context.userId) {
      const lastTime = userLastAdTimes.get(context.userId);
      if (lastTime) {
        const elapsedSec = (Date.now() - lastTime) / 1000;
        if (elapsedSec < FREQUENCY_CONFIG.minTimeSecondsBetweenAds) {
          return {
            eligible: false,
            reason: `Frequency cooldown active (${Math.round(elapsedSec)}s/${FREQUENCY_CONFIG.minTimeSecondsBetweenAds}s)`,
          };
        }
      }
    }

    return { eligible: true };
  }

  /**
   * Record that an ad was delivered to user to update sliding cooldown
   */
  static recordDelivery(userId?: string): void {
    if (userId) {
      userLastAdTimes.set(userId, Date.now());

      // Memory hygiene: trim map if size exceeds 10,000 entries
      if (userLastAdTimes.size > 10000) {
        const oldestCutoff = Date.now() - 3600 * 1000;
        for (const [uid, time] of userLastAdTimes.entries()) {
          if (time < oldestCutoff) {
            userLastAdTimes.delete(uid);
          }
        }
      }
    }
  }
}
