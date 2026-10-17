/**
 * Peto - Android Promotion Utility
 *
 * Provides conservative client-side detection for Android mobile web visitors,
 * safe localStorage dismissal persistence (~14 days), and Play Store URL resolution.
 * Strictly excludes iOS, desktop browsers, and installed app WebViews.
 */

export const ANDROID_DISMISSAL_STORAGE_KEY = "peto_android_banner_dismissed_until";
export const DEFAULT_DISMISSAL_DAYS = 14;

/**
 * Retrieves the configured official Google Play Store URL from environment variables.
 * Never invents or assumes a package name. Returns null if not configured or empty.
 */
export function getPlayStoreUrl(): string | null {
  try {
    const envUrl =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_PLAY_STORE_URL || import.meta.env.VITE_GOOGLE_PLAY_STORE_URL)) ||
      "";

    const trimmed = String(envUrl).trim();
    if (!trimmed) {
      return null;
    }

    // Must be a valid URL string starting with https://, http://, or market://
    if (/^(https?:\/\/|market:\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if the current visitor is using an installed Android app WebView
 * or standalone PWA/TWA mode.
 */
export function isAndroidWebViewOrStandalone(ua: string, isStandalone?: boolean): boolean {
  if (isStandalone) {
    return true;
  }

  // Common Android WebView indicators:
  // - "; wv" marker in Chrome WebView UA (e.g., "Linux; U; Android 14; ...; wv)")
  // - "WebView" explicit token
  // - "Version/X.X Chrome/..." (typical Chrome WebView wrapper pattern)
  // - Peto-specific native app wrapper token if configured in native shell
  const isWvToken = /;\s*wv/i.test(ua);
  const isWebViewWord = /webview/i.test(ua);
  const isChromeWebViewPattern = /Version\/[0-9.]+\s+Chrome\//i.test(ua);
  const isPetoNativeToken = /peto(app|_android|_native)/i.test(ua);

  return isWvToken || isWebViewWord || isChromeWebViewPattern || isPetoNativeToken;
}

/**
 * Conservative client-side check for Android mobile devices.
 * Strictly excludes iOS (iPhone, iPad, iPod) and desktop browsers (Windows, Mac, ChromeOS, Linux desktop).
 */
export function isAndroidMobileDevice(uaInput?: string, isStandaloneInput?: boolean): boolean {
  const ua =
    uaInput !== undefined
      ? uaInput
      : typeof navigator !== "undefined"
      ? navigator.userAgent || ""
      : "";

  if (!ua) {
    return false;
  }

  const uaLower = ua.toLowerCase();

  // 1. Must contain "android"
  if (!uaLower.includes("android")) {
    return false;
  }

  // 2. Strictly exclude iOS (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/i.test(ua)) {
    return false;
  }

  // 3. Strictly exclude desktop OS strings
  if (/windows nt|macintosh|cros/i.test(ua)) {
    return false;
  }

  // 4. Must be a mobile form factor (Android Mobile)
  // Note: Standard Android phone browsers include "mobile" in the UA
  const hasMobileToken = /mobile/i.test(ua);
  if (!hasMobileToken) {
    // If "mobile" is omitted (e.g. tablet), verify screen dimensions client-side if available
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const isSmallScreen = window.matchMedia("(max-width: 1024px)").matches;
      if (!isSmallScreen) {
        return false;
      }
    } else {
      return false;
    }
  }

  // 5. Exclude installed Android WebView or Standalone app mode
  let isStandalone = isStandaloneInput;
  if (isStandalone === undefined && typeof window !== "undefined") {
    const isMediaStandalone =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches;
    const isNavStandalone = Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone);
    isStandalone = isMediaStandalone || isNavStandalone;
  }

  if (isAndroidWebViewOrStandalone(ua, isStandalone)) {
    return false;
  }

  return true;
}

/**
 * Checks if the user has previously dismissed the banner within the dismissal window.
 * Uses safe local storage access with graceful fallback for private browsing.
 */
export function isBannerDismissed(customStorage?: Storage | null): boolean {
  try {
    const storage =
      customStorage !== undefined
        ? customStorage
        : typeof window !== "undefined"
        ? window.localStorage
        : null;

    if (!storage) {
      return false;
    }

    const dismissedUntilRaw = storage.getItem(ANDROID_DISMISSAL_STORAGE_KEY);
    if (!dismissedUntilRaw) {
      return false;
    }

    const dismissedUntil = parseInt(dismissedUntilRaw, 10);
    if (Number.isNaN(dismissedUntil)) {
      return false;
    }

    return Date.now() < dismissedUntil;
  } catch {
    // Graceful fallback for strict storage restrictions or cookies disabled
    return false;
  }
}

/**
 * Records banner dismissal for the specified number of days (default 14 days).
 * Safe against storage errors.
 */
export function dismissBanner(
  days: number = DEFAULT_DISMISSAL_DAYS,
  customStorage?: Storage | null
): boolean {
  try {
    const storage =
      customStorage !== undefined
        ? customStorage
        : typeof window !== "undefined"
        ? window.localStorage
        : null;

    if (!storage) {
      return false;
    }

    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    storage.setItem(ANDROID_DISMISSAL_STORAGE_KEY, expiry.toString());
    return true;
  } catch {
    // Graceful fallback if storage cannot be written
    return false;
  }
}

/**
 * Comprehensive check whether the Android promotion banner should be rendered.
 * Guarantees that:
 * 1. Play Store URL is configured.
 * 2. Visitor is on Android Mobile.
 * 3. Visitor has not dismissed the promotion within the last 14 days.
 */
export function shouldShowAndroidBanner(options?: {
  ua?: string;
  storeUrl?: string | null;
  dismissed?: boolean;
  isStandalone?: boolean;
  storage?: Storage | null;
}): boolean {
  // 1. Play Store URL must be configured and valid
  const storeUrl = options?.storeUrl !== undefined ? options.storeUrl : getPlayStoreUrl();
  if (!storeUrl) {
    return false;
  }

  // 2. Check dismissal persistence
  const dismissed =
    options?.dismissed !== undefined
      ? options.dismissed
      : isBannerDismissed(options?.storage);
  if (dismissed) {
    return false;
  }

  // 3. Must be Android Mobile (excluding iOS, Desktop, WebViews)
  return isAndroidMobileDevice(options?.ua, options?.isStandalone);
}
