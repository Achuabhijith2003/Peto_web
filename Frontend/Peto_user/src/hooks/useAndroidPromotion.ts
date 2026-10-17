import { useState, useEffect, useCallback } from "react";
import {
  getPlayStoreUrl,
  shouldShowAndroidBanner,
  dismissBanner,
  DEFAULT_DISMISSAL_DAYS,
} from "../utils/androidPromotion";
import api from "../utils/api";

export interface AndroidPromotionState {
  isVisible: boolean;
  storeUrl: string | null;
  dismiss: () => void;
}

export function useAndroidPromotion(): AndroidPromotionState {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applyStoreUrl = (url: string | null) => {
      if (!isMounted) return;
      setStoreUrl(url);

      if (!url) {
        setIsVisible(false);
        return;
      }

      const show = shouldShowAndroidBanner({ storeUrl: url });
      setIsVisible(show);
    };

    // 1. Try local frontend-bundled environment variable first
    const localUrl = getPlayStoreUrl();
    if (localUrl) {
      applyStoreUrl(localUrl);
      return;
    }

    // 2. Fall back to backend public app config (when .env is configured only on the backend)
    api
      .get("/app-config")
      .then((res) => {
        if (!isMounted) return;
        const remoteUrl = res.data?.playStoreUrl;
        if (remoteUrl && typeof remoteUrl === "string" && remoteUrl.trim()) {
          applyStoreUrl(remoteUrl.trim());
        } else {
          applyStoreUrl(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        applyStoreUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    dismissBanner(DEFAULT_DISMISSAL_DAYS);
  }, []);

  return {
    isVisible,
    storeUrl,
    dismiss,
  };
}
