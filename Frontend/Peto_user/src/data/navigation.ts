import {
  House,
  Clapperboard,
  Search,
  Users,
  Bookmark,
  Settings as SettingsIcon,
  Building2,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: typeof House;
  requiresFeature?: string;
}

export const CANONICAL_NAV_ITEMS: NavItem[] = [
  {
    id: "feed",
    label: "Feed",
    route: "/social",
    icon: House,
  },
  {
    id: "reels",
    label: "Reels",
    route: "/reels",
    icon: Clapperboard,
  },
  {
    id: "explore",
    label: "Explore",
    route: "/search",
    icon: Search,
  },
  {
    id: "communities",
    label: "Communities",
    route: "/community",
    icon: Users,
  },
  {
    id: "bookmarks",
    label: "Saved Posts",
    route: "/bookmarks",
    icon: Bookmark,
  },
  {
    id: "advertiser",
    label: "Advertiser Portal",
    route: "/advertiser",
    icon: Building2,
    requiresFeature: "PETO_ADS_MARKETPLACE",
  },
  {
    id: "settings",
    label: "Settings",
    route: "/settings",
    icon: SettingsIcon,
  },
];
