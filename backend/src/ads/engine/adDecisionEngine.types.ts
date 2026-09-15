export type AdPlacement = 'FEED' | 'REELS' | 'COMMUNITY_FEED' | 'EXPLORE';
export type AdSource = 'PETO' | 'EXTERNAL' | 'NONE';

export interface AdRequestContext {
  userId?: string;
  country: string;
  placement: AdPlacement;
  device?: 'IOS' | 'ANDROID' | 'WEB' | 'ALL';
  language?: string;
  petInterests?: string[];
  organicCountSinceLastAd?: number;
}

export interface AdDecisionResult {
  hasAd: boolean;
  source: AdSource;
  externalNetwork?: string;
  ad?: any;
  externalPayload?: any;
  decisionReason?: string;
}
