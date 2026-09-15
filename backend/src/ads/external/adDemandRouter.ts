import { AdMobAdapter } from "./admob.adapter";
import { ExternalAdNetworkAdapter, ExternalAdPayload } from "./externalAdNetwork.interface";
import { AdRequestContext, AdDecisionResult } from "../engine/adDecisionEngine.types";
import { getRegionalConfig } from "../../regions/regional.service";

export class AdDemandRouter {
  private static networks: Map<string, ExternalAdNetworkAdapter> = new Map([
    ["admob", new AdMobAdapter()],
  ]);

  /**
   * Request demand from eligible external networks for region
   */
  static async requestExternalDemand(
    context: AdRequestContext
  ): Promise<{ payload: ExternalAdPayload | null; network: string | null }> {
    const config = await getRegionalConfig(context.country);
    const networkRules = config.external_ad_networks || {};

    // Sort networks by priority in region
    const activeCandidates = Object.entries(networkRules)
      .filter(([_, conf]) => conf && conf.enabled)
      .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));

    for (const [networkName, _] of activeCandidates) {
      const adapter = this.networks.get(networkName.toLowerCase());
      if (adapter && adapter.isAvailable(context.country)) {
        try {
          // Circuit breaker: 800ms timeout promise
          const result = await Promise.race([
            adapter.requestAd(context),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
          ]);

          if (result) {
            return { payload: result, network: networkName };
          }
        } catch {
          // Non-blocking failure, try next candidate
        }
      }
    }

    return { payload: null, network: null };
  }
}
