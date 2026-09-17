import { AdMobAdapter } from "./admob.adapter";
import { WebAdsAdapter } from "./webAds.adapter";
import { ExternalAdNetworkAdapter, ExternalAdPayload } from "./externalAdNetwork.interface";
import { AdRequestContext } from "../engine/adDecisionEngine.types";
import { getRegionalConfig } from "../../regions/regional.service";
import { AdControlsService } from "../adControls.service";
import { AdProviderHealthService } from "./adProviderHealth.service";

export class AdDemandRouter {
  private static networks: Map<string, ExternalAdNetworkAdapter> = new Map<string, ExternalAdNetworkAdapter>([
    ["admob", new AdMobAdapter() as ExternalAdNetworkAdapter],
    ["adsense", new WebAdsAdapter() as ExternalAdNetworkAdapter],
  ]);

  /**
   * Request demand from eligible external networks for region & platform
   */
  static async requestExternalDemand(
    context: AdRequestContext
  ): Promise<{ payload: ExternalAdPayload | null; network: string | null }> {
    const controls = await AdControlsService.getControls();
    if (!controls.external_ads_enabled) {
      return { payload: null, network: null };
    }

    const config = await getRegionalConfig(context.country);
    const networkRules = config.external_ad_networks || {};

    const isWeb = context.device === "WEB";
    const primaryNetwork = isWeb ? "adsense" : "admob";

    // Check individual provider kill switches
    if (primaryNetwork === "admob" && !controls.admob_enabled) {
      return { payload: null, network: null };
    }
    if (primaryNetwork === "adsense" && !controls.web_ads_enabled) {
      return { payload: null, network: null };
    }

    // Check provider health before dispatching
    if (!AdProviderHealthService.isProviderHealthy(primaryNetwork)) {
      return { payload: null, network: null };
    }

    const adapter = this.networks.get(primaryNetwork);
    if (!adapter || !adapter.isAvailable(context.country, context.device)) {
      return { payload: null, network: null };
    }

    const startTime = Date.now();
    try {
      // 800ms Circuit Breaker Timeout
      let timedOut = false;
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, 800)
      );

      const result = await Promise.race([
        adapter.requestAd(context),
        timeoutPromise,
      ]);

      const elapsed = Date.now() - startTime;

      if (timedOut) {
        await AdProviderHealthService.recordProviderResult(
          primaryNetwork,
          false,
          elapsed,
          "CIRCUIT_BREAKER_TIMEOUT",
          "Provider exceeded 800ms latency ceiling",
          true
        );
        return { payload: null, network: null };
      }

      if (result) {
        await AdProviderHealthService.recordProviderResult(
          primaryNetwork,
          true,
          elapsed
        );
        return { payload: result, network: primaryNetwork };
      } else {
        await AdProviderHealthService.recordProviderResult(
          primaryNetwork,
          false,
          elapsed,
          "NO_FILL",
          "Provider returned empty ad response",
          false
        );
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      await AdProviderHealthService.recordProviderResult(
        primaryNetwork,
        false,
        elapsed,
        err.code || "REQUEST_EXCEPTION",
        err.message,
        false
      );
    }

    return { payload: null, network: null };
  }
}
