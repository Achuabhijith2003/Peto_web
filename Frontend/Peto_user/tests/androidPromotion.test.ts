import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAndroidMobileDevice,
  isAndroidWebViewOrStandalone,
  isBannerDismissed,
  dismissBanner,
  shouldShowAndroidBanner,
  ANDROID_DISMISSAL_STORAGE_KEY,
} from "../src/utils/androidPromotion";

// Realistic User-Agent test fixtures
const UA_FIXTURES = {
  // Android Mobile browsers (Expected: TRUE)
  pixelChromeMobile:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  samsungGalaxyMobile:
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
  firefoxAndroidMobile:
    "Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
  operaAndroidMobile:
    "Mozilla/5.0 (Linux; Android 14; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 OPR/79.0.0.0",

  // iOS devices (Expected: FALSE)
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  ipodTouch:
    "Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",

  // Desktop browsers (Expected: FALSE)
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  linuxDesktopFirefox:
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
  chromeOs:
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

  // Android WebViews & App wrappers (Expected: FALSE)
  androidChromeWebViewWv:
    "Mozilla/5.0 (Linux; U; Android 14; en-us; Pixel 8 Pro Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36",
  androidVersionWebView:
    "Mozilla/5.0 (Linux; Android 14; SM-G998B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36",
  androidExplicitWebView:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7; WebView) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
  petoAppCustomUA:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro; PetoApp/1.0.0) AppleWebKit/537.36 Mobile Safari/537.36",
};

// Minimal in-memory Mock Storage for safe testing of persistence
function createMockStorage(initialData: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initialData };
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    get length(): number {
      return Object.keys(store).length;
    },
  };
}

describe("Peto Android Play Store Promotion Tests", () => {
  describe("1. Android Mobile Browser Detection", () => {
    it("identifies Pixel Chrome Android as Android Mobile", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.pixelChromeMobile), true);
    });

    it("identifies Samsung Galaxy browser as Android Mobile", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.samsungGalaxyMobile), true);
    });

    it("identifies Firefox Android as Android Mobile", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.firefoxAndroidMobile), true);
    });

    it("identifies Opera Android as Android Mobile", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.operaAndroidMobile), true);
    });
  });

  describe("2. iOS Exclusions (iPhone / iPad / iPod)", () => {
    it("excludes iPhone Safari visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.iphoneSafari), false);
    });

    it("excludes iPhone Chrome visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.iphoneChrome), false);
    });

    it("excludes iPad Safari visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.ipadSafari), false);
    });

    it("excludes iPod Touch visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.ipodTouch), false);
    });
  });

  describe("3. Desktop Exclusions", () => {
    it("excludes Windows Chrome desktop visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.windowsChrome), false);
    });

    it("excludes Windows Edge desktop visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.windowsEdge), false);
    });

    it("excludes macOS Safari desktop visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.macSafari), false);
    });

    it("excludes macOS Chrome desktop visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.macChrome), false);
    });

    it("excludes Linux desktop visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.linuxDesktopFirefox), false);
    });

    it("excludes ChromeOS visitors", () => {
      assert.strictEqual(isAndroidMobileDevice(UA_FIXTURES.chromeOs), false);
    });
  });

  describe("4. Android WebView & Standalone App Exclusions", () => {
    it("excludes Android WebView containing '; wv'", () => {
      assert.strictEqual(
        isAndroidWebViewOrStandalone(UA_FIXTURES.androidChromeWebViewWv),
        true
      );
      assert.strictEqual(
        isAndroidMobileDevice(UA_FIXTURES.androidChromeWebViewWv),
        false
      );
    });

    it("excludes Android WebView with Version/4.0 Chrome pattern", () => {
      assert.strictEqual(
        isAndroidWebViewOrStandalone(UA_FIXTURES.androidVersionWebView),
        true
      );
      assert.strictEqual(
        isAndroidMobileDevice(UA_FIXTURES.androidVersionWebView),
        false
      );
    });

    it("excludes Android WebView containing 'WebView' word", () => {
      assert.strictEqual(
        isAndroidWebViewOrStandalone(UA_FIXTURES.androidExplicitWebView),
        true
      );
      assert.strictEqual(
        isAndroidMobileDevice(UA_FIXTURES.androidExplicitWebView),
        false
      );
    });

    it("excludes native app wrapper UA containing 'PetoApp'", () => {
      assert.strictEqual(
        isAndroidWebViewOrStandalone(UA_FIXTURES.petoAppCustomUA),
        true
      );
      assert.strictEqual(
        isAndroidMobileDevice(UA_FIXTURES.petoAppCustomUA),
        false
      );
    });

    it("excludes browser in standalone display-mode (installed PWA / TWA)", () => {
      assert.strictEqual(
        isAndroidMobileDevice(UA_FIXTURES.pixelChromeMobile, true),
        false
      );
    });
  });

  describe("5. Dismissal Persistence (~14 days)", () => {
    it("defaults to not dismissed when storage is empty", () => {
      const mockStorage = createMockStorage();
      assert.strictEqual(isBannerDismissed(mockStorage), false);
    });

    it("persists dismissal for ~14 days upon dismissal", () => {
      const mockStorage = createMockStorage();
      const success = dismissBanner(14, mockStorage);
      assert.strictEqual(success, true);

      // Verify item was stored in mockStorage
      const rawStored = mockStorage.getItem(ANDROID_DISMISSAL_STORAGE_KEY);
      assert.ok(rawStored, "Dismissal timestamp should be recorded in storage");

      const timestamp = parseInt(rawStored as string, 10);
      const expectedMin = Date.now() + 13 * 24 * 60 * 60 * 1000;
      const expectedMax = Date.now() + 15 * 24 * 60 * 60 * 1000;
      assert.ok(
        timestamp >= expectedMin && timestamp <= expectedMax,
        "Timestamp should be approximately 14 days in the future"
      );

      // Banner should now be reported as dismissed
      assert.strictEqual(isBannerDismissed(mockStorage), true);
    });

    it("re-enables promotion once the dismissal duration has expired", () => {
      const pastTimestamp = Date.now() - 1000; // Expired 1 second ago
      const mockStorage = createMockStorage({
        [ANDROID_DISMISSAL_STORAGE_KEY]: pastTimestamp.toString(),
      });

      assert.strictEqual(isBannerDismissed(mockStorage), false);
    });

    it("gracefully falls back when storage throws an exception", () => {
      const throwingStorage = {
        getItem() {
          throw new Error("QuotaExceeded or SecurityError in strict private browsing");
        },
        setItem() {
          throw new Error("QuotaExceeded or SecurityError in strict private browsing");
        },
      } as unknown as Storage;

      assert.doesNotThrow(() => {
        const dismissed = isBannerDismissed(throwingStorage);
        assert.strictEqual(dismissed, false);
      });

      assert.doesNotThrow(() => {
        const saved = dismissBanner(14, throwingStorage);
        assert.strictEqual(saved, false);
      });
    });
  });

  describe("6. Store URL Configuration & Display Decision", () => {
    const validStoreUrl =
      "https://play.google.com/store/apps/details?id=com.example.peto";

    it("suppresses banner when Play Store URL is missing or empty", () => {
      const showMissing = shouldShowAndroidBanner({
        ua: UA_FIXTURES.pixelChromeMobile,
        storeUrl: null,
      });
      assert.strictEqual(showMissing, false);

      const showEmpty = shouldShowAndroidBanner({
        ua: UA_FIXTURES.pixelChromeMobile,
        storeUrl: "",
      });
      assert.strictEqual(showEmpty, false);
    });

    it("displays banner when official Play Store URL is configured for Android Mobile", () => {
      const show = shouldShowAndroidBanner({
        ua: UA_FIXTURES.pixelChromeMobile,
        storeUrl: validStoreUrl,
        dismissed: false,
      });
      assert.strictEqual(show, true);
    });

    it("suppresses banner for iOS even if Play Store URL is configured", () => {
      const show = shouldShowAndroidBanner({
        ua: UA_FIXTURES.iphoneSafari,
        storeUrl: validStoreUrl,
        dismissed: false,
      });
      assert.strictEqual(show, false);
    });

    it("suppresses banner for Desktop even if Play Store URL is configured", () => {
      const show = shouldShowAndroidBanner({
        ua: UA_FIXTURES.windowsChrome,
        storeUrl: validStoreUrl,
        dismissed: false,
      });
      assert.strictEqual(show, false);
    });

    it("suppresses banner when previously dismissed within 14 days", () => {
      const show = shouldShowAndroidBanner({
        ua: UA_FIXTURES.pixelChromeMobile,
        storeUrl: validStoreUrl,
        dismissed: true,
      });
      assert.strictEqual(show, false);
    });

    it("suppresses banner inside Android WebView even if URL configured", () => {
      const show = shouldShowAndroidBanner({
        ua: UA_FIXTURES.androidChromeWebViewWv,
        storeUrl: validStoreUrl,
        dismissed: false,
      });
      assert.strictEqual(show, false);
    });
  });
});
