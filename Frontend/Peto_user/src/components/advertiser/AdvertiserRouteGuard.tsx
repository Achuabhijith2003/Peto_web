import React from "react";
import { useFeature } from "../../hooks/useFeatures";
import AdvertiserPortal from "../../pages/advertiser/AdvertiserPortal";
import AdvertiserDisabledNotice from "../../pages/advertiser/AdvertiserDisabledNotice";

export const AdvertiserRouteGuard: React.FC = () => {
  const isMarketplaceEnabled = useFeature("PETO_ADS_MARKETPLACE");

  if (!isMarketplaceEnabled) {
    return <AdvertiserDisabledNotice />;
  }

  return <AdvertiserPortal />;
};

export default AdvertiserRouteGuard;
