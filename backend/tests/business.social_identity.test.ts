// Mock env vars before any imports
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "test_anon_key";

import test from "node:test";
import assert from "node:assert/strict";

const { mapPostForFeed } = await import("../src/posts/feed.mapper.js");

test("feed mapper correctly styles business post with yellow verified badge and business identity", () => {
  const businessPost = {
    id: "post-123",
    user_id: "human-operator-456",
    text: "Introducing our new organic puppy food line!",
    visibility: "public",
    author_type: "BUSINESS",
    business_id: "biz-789",
    business: {
      id: "biz-789",
      name: "HappyPaws Nutrition",
      username: "happypaws",
      avatar_url: "https://example.com/logo.png",
      is_verified: true,
    },
    profiles: {
      id: "human-operator-456",
      username: "john_smith",
      full_name: "John Smith",
      avatar_url: "https://example.com/john.jpg",
    },
    likes_count: 5,
    comments_count: 2,
    bookmarks_count: 1,
  };

  const mapped = mapPostForFeed(businessPost);

  // Author identity must be the Business, NOT the operator
  assert.equal(mapped.author.id, "biz-789");
  assert.equal(mapped.author.full_name, "HappyPaws Nutrition");
  assert.equal(mapped.author.username, "happypaws");
  assert.equal(mapped.author.avatar_url, "https://example.com/logo.png");
  assert.equal(mapped.author.is_business, true);
  assert.equal(mapped.author.badge_type, "BUSINESS_VERIFIED");
  assert.equal(mapped.author.verified, true);
  assert.equal(mapped.author_type, "BUSINESS");
  assert.equal(mapped.business_id, "biz-789");

  // Internal user_id is retained for operator auditing
  assert.equal(mapped.user_id, "human-operator-456");
});

test("feed mapper preserves personal post as user with standard badge", () => {
  const userPost = {
    id: "post-999",
    user_id: "user-111",
    text: "Walking in the park with Rocky",
    visibility: "public",
    author_type: "USER",
    profiles: {
      id: "user-111",
      username: "rocky_dad",
      full_name: "Alex Doe",
      avatar_url: "https://example.com/alex.jpg",
      verified: true,
    },
    likes_count: 10,
  };

  const mapped = mapPostForFeed(userPost);

  assert.equal(mapped.author.id, "user-111");
  assert.equal(mapped.author.full_name, "Alex Doe");
  assert.equal(mapped.author.is_business, false);
  assert.equal(mapped.author.badge_type, "VERIFIED");
  assert.equal(mapped.author_type, "USER");
  assert.equal(mapped.business_id, null);
});
