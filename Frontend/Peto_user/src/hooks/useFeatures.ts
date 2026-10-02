import { useState, useEffect } from "react";
import api from "../utils/api";

export interface PublicAdFeatures {
  petoAdsMarketplace: boolean;
  googleAdsWeb: boolean;
  googleAdsMobile: boolean;
}

const DEFAULT_FEATURES: PublicAdFeatures = {
  petoAdsMarketplace: false,
  googleAdsWeb: true,
  googleAdsMobile: true,
};

let cachedFeatures: PublicAdFeatures = { ...DEFAULT_FEATURES };
let hasFetched = false;
const listeners = new Set<(features: PublicAdFeatures) => void>();

export function useFeatures() {
  const [features, setFeatures] = useState<PublicAdFeatures>(cachedFeatures);
  const [loading, setLoading] = useState<boolean>(!hasFetched);

  useEffect(() => {
    const handleUpdate = (updated: PublicAdFeatures) => {
      setFeatures(updated);
      setLoading(false);
    };

    listeners.add(handleUpdate);

    if (!hasFetched) {
      hasFetched = true;
      api
        .get("/ads/features")
        .then((res) => {
          if (res.data?.success && res.data?.features) {
            cachedFeatures = {
              ...DEFAULT_FEATURES,
              ...res.data.features,
            };
            listeners.forEach((l) => l(cachedFeatures));
          }
        })
        .catch(() => {
          // On network error, stick to safe defaults (marketplace false)
          listeners.forEach((l) => l(DEFAULT_FEATURES));
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const isFeatureEnabled = (
    key: "PETO_ADS_MARKETPLACE" | "GOOGLE_ADS_WEB" | "GOOGLE_ADS_MOBILE"
  ): boolean => {
    switch (key) {
      case "PETO_ADS_MARKETPLACE":
        return Boolean(features.petoAdsMarketplace);
      case "GOOGLE_ADS_WEB":
        return Boolean(features.googleAdsWeb);
      case "GOOGLE_ADS_MOBILE":
        return Boolean(features.googleAdsMobile);
      default:
        return false;
    }
  };

  return { features, loading, isFeatureEnabled };
}

export function useFeature(
  key: "PETO_ADS_MARKETPLACE" | "GOOGLE_ADS_WEB" | "GOOGLE_ADS_MOBILE"
): boolean {
  const { isFeatureEnabled } = useFeatures();
  return isFeatureEnabled(key);
}
