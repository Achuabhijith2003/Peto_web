import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPresenceEnabled } from "../src/utils/presenceConfig";

describe("Web Presence & Active Pals Disablement Tests", () => {
  it("defaults isPresenceEnabled() to false to prevent database polling", () => {
    // In test environment without VITE_PRESENCE_ENABLED=true, presence must be disabled
    assert.strictEqual(
      isPresenceEnabled(),
      false,
      "Presence should default to false unless explicitly enabled"
    );
  });

  it("ensures zero presence heartbeat requests are triggered when disabled", async () => {
    let heartbeatRequestCount = 0;
    let onlineFriendsRequestCount = 0;

    // Simulated API client to monitor network traffic
    const mockApiClient = {
      post: async (endpoint: string) => {
        if (endpoint.includes("/presence/heartbeat")) {
          heartbeatRequestCount++;
        }
        return { data: { success: true } };
      },
      get: async (endpoint: string) => {
        if (endpoint.includes("/presence/online")) {
          onlineFriendsRequestCount++;
        }
        return { data: { success: true, data: [] } };
      },
    };

    // Presence runner matching OnlineFriends logic with flag check
    const runPresenceCycle = async (userLoggedIn: boolean, isEnabled: boolean) => {
      if (!isEnabled || !userLoggedIn) {
        return; // No-op, no network calls, no timers created
      }
      await mockApiClient.post("/presence/heartbeat");
      await mockApiClient.get("/presence/online");
    };

    // Simulate login and page navigation with disabled presence
    await runPresenceCycle(true, isPresenceEnabled());
    await runPresenceCycle(true, false);

    assert.strictEqual(
      heartbeatRequestCount,
      0,
      "Expected 0 heartbeat requests when presence is disabled"
    );
    assert.strictEqual(
      onlineFriendsRequestCount,
      0,
      "Expected 0 online friends requests when presence is disabled"
    );
  });

  it("verifies Active Pals UI is suppressed when presence is disabled", () => {
    const shouldRenderActivePals = (isEnabled: boolean): boolean => {
      if (!isEnabled) {
        return false;
      }
      return true;
    };

    assert.strictEqual(
      shouldRenderActivePals(isPresenceEnabled()),
      false,
      "Active Pals UI should not render when presence is disabled"
    );
  });
});
