import { useState, useEffect, useCallback } from "react";
import {
  getPlayStoreUrl,
  shouldShowAndroidBanner,
  dismissBanner,
  DEFAULT_DISMISSAL_DAYS,
} from "../utils/androidPromotion";

export interface AndroidPromotionState {
  isVisible: boolean;
  storeUrl: string | null;
  dismiss: () => void;
}

export function useAndroidPromotion(): AndroidPromotionState {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = getPlayStoreUrl();
    setStoreUrl(url);

    if (!url) {
      setIsVisible(false);
      return;
    }

    const show = shouldShowAndroidBanner({ storeUrl: url });
    setIsVisible(show);
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
