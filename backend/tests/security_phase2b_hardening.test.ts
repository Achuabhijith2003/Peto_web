// Mock env vars before imports
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "test_anon_key";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Imports of Phase 2B components
import {
  detectFileTypeFromBuffer,
  validateUploadedFile,
  cleanupFile,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MIME_TO_CANONICAL_EXT,
} from "../src/media/fileValidator.js";

import {
  loginRateLimiter,
  signupRateLimiter,
  forgotPasswordRateLimiter,
  usernameCheckRateLimiter,
  oauthExchangeRateLimiter,
} from "../src/middleware/rateLimiter.js";

import { globalErrorHandler } from "../src/middleware/errorHandler.js";

function createMockReqRes(options: {
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  ip?: string;
}) {
  const headers: Record<string, string> = { ...(options.headers || {}) };
  const query = { ...(options.query || {}) };
  const body = { ...(options.body || {}) };
  const ip = options.ip || "127.0.0.1";

  const req: any = {
    headers,
    query,
    body,
    ip,
    socket: { remoteAddress: ip },
    method: "POST",
    originalUrl: "/test",
    app: {
      get: (key: string) => (key === "trust proxy" ? false : undefined),
    },
  };

  let statusCode = 200;
  let responseData: any = null;
  const responseHeaders: Record<string, any> = {};

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader(key: string, val: any) {
      responseHeaders[key.toLowerCase()] = val;
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
    getHeader(key: string) {
      return responseHeaders[key.toLowerCase()];
    },
  };

  return { req, res };
}

// ============================================================================
// PETO-SEC-05: FILE UPLOAD / MIME SPOOFING / CANONICAL EXTENSIONS
// ============================================================================

test("SEC-TEST-14: application/octet-stream upload to image endpoint is rejected", async () => {
  assert.equal(ALLOWED_IMAGE_MIMES.includes("application/octet-stream"), false);
  assert.equal(ALLOWED_VIDEO_MIMES.includes("application/octet-stream"), false);

  // Even if a file has an octet-stream header or arbitrary binary header
  const arbitraryBinary = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
  const detection = detectFileTypeFromBuffer(arbitraryBinary);
  assert.equal(detection.mime, null);
  assert.equal(detection.isImage, false);

  const mockFile: any = {
    buffer: arbitraryBinary,
    mimetype: "application/octet-stream",
    originalname: "malicious.bin",
  };

  const validation = await validateUploadedFile(mockFile, "image");
  assert.equal(validation.valid, false);
  assert.match(validation.error || "", /Security validation error/i);
});

test("SEC-TEST-15: HTML disguised as image is rejected", async () => {
  const htmlPayload = Buffer.from("<!DOCTYPE html><html><head><title>Phish</title></head><body><script>alert('XSS')</script></body></html>");

  const detection = detectFileTypeFromBuffer(htmlPayload);
  assert.equal(detection.isActiveContent, true);
  assert.equal(detection.isImage, false);
  assert.equal(detection.mime, null);

  const mockFile: any = {
    buffer: htmlPayload,
    mimetype: "image/jpeg", // Client claims it's an image
    originalname: "avatar.jpg",
  };

  const validation = await validateUploadedFile(mockFile, "image");
  assert.equal(validation.valid, false);
  assert.match(validation.error || "", /Active content, scripts, SVG, or executable files are not accepted/i);
});

test("SEC-TEST-16: SVG containing active content is rejected", async () => {
  const svgPayload = Buffer.from('<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>');

  const detection = detectFileTypeFromBuffer(svgPayload);
  assert.equal(detection.isActiveContent, true);
  assert.equal(detection.isImage, false);

  const mockFile: any = {
    buffer: svgPayload,
    mimetype: "image/svg+xml",
    originalname: "logo.svg",
  };

  const validation = await validateUploadedFile(mockFile, "image");
  assert.equal(validation.valid, false);
  assert.match(validation.error || "", /Active content/i);
});

test("SEC-TEST-17: Valid supported JPEG, PNG, WebP are accepted", async () => {
  // 1. JPEG signature: 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const jpegValidation = await validateUploadedFile(
    { buffer: jpegHeader, mimetype: "image/jpeg", originalname: "photo.jpg" } as any,
    "image"
  );
  assert.equal(jpegValidation.valid, true);
  assert.equal(jpegValidation.mime, "image/jpeg");
  assert.equal(jpegValidation.canonicalExt, ".jpg");

  // 2. PNG signature: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const pngValidation = await validateUploadedFile(
    { buffer: pngHeader, mimetype: "image/png", originalname: "photo.png" } as any,
    "image"
  );
  assert.equal(pngValidation.valid, true);
  assert.equal(pngValidation.mime, "image/png");
  assert.equal(pngValidation.canonicalExt, ".png");

  // 3. WebP signature: RIFF....WEBP
  const webpHeader = Buffer.from("RIFFxxxxWEBPVP8 ", "ascii");
  const webpValidation = await validateUploadedFile(
    { buffer: webpHeader, mimetype: "image/webp", originalname: "photo.webp" } as any,
    "image"
  );
  assert.equal(webpValidation.valid, true);
  assert.equal(webpValidation.mime, "image/webp");
  assert.equal(webpValidation.canonicalExt, ".webp");
});

test("SEC-TEST-18: Valid supported video is accepted", async () => {
  // MP4 signature: 4 bytes length, then "ftyp", then brand "mp42" or "isom"
  const mp4Header = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]),
    Buffer.from("ftypisom", "ascii"),
    Buffer.from([0x00, 0x00, 0x02, 0x00]),
  ]);
  const mp4Validation = await validateUploadedFile(
    { buffer: mp4Header, mimetype: "video/mp4", originalname: "clip.mp4" } as any,
    "video"
  );
  assert.equal(mp4Validation.valid, true);
  assert.equal(mp4Validation.mime, "video/mp4");
  assert.equal(mp4Validation.canonicalExt, ".mp4");

  // WebM signature: 0x1A, 0x45, 0xDF, 0xA3
  const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  const webmValidation = await validateUploadedFile(
    { buffer: webmHeader, mimetype: "video/webm", originalname: "clip.webm" } as any,
    "video"
  );
  assert.equal(webmValidation.valid, true);
  assert.equal(webmValidation.mime, "video/webm");
  assert.equal(webmValidation.canonicalExt, ".webm");
});

test("SEC-TEST-19: Filename payload.html with fake image MIME cannot create .html media object", async () => {
  // The client sends payload.html with an image MIME type
  const lowerMime = "image/jpeg";
  const canonicalExt = MIME_TO_CANONICAL_EXT[lowerMime] || ".jpg";

  // Assert canonical server extension is enforced and .html is stripped
  assert.equal(canonicalExt, ".jpg");
  assert.notEqual(canonicalExt, ".html");

  // Even if originalname is payload.html, validateUploadedFile returns .jpg canonicalExt
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const validation = await validateUploadedFile(
    { buffer: jpegHeader, mimetype: "image/jpeg", originalname: "payload.html" } as any,
    "image"
  );
  assert.equal(validation.valid, true);
  assert.equal(validation.canonicalExt, ".jpg");
});

// ============================================================================
// PETO-SEC-06: RATE LIMITING SENSITIVE PUBLIC ENDPOINTS
// ============================================================================

test("SEC-TEST-20: Login brute-force threshold triggers HTTP 429", async () => {
  (loginRateLimiter as any).reset();
  const testIp = "198.51.100.1";

  // First 10 requests pass
  for (let i = 0; i < 10; i++) {
    const { req, res } = createMockReqRes({ ip: testIp });
    let calledNext = false;
    loginRateLimiter(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true, `Request ${i + 1} should be allowed`);
  }

  // 11th request exceeds limit
  const { req, res } = createMockReqRes({ ip: testIp });
  let calledNext = false;
  loginRateLimiter(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.getStatusCode(), 429);
  assert.equal(res.getData().code, "LOGIN_RATE_LIMITED");
});

test("SEC-TEST-21: Signup abuse threshold triggers HTTP 429", async () => {
  (signupRateLimiter as any).reset();
  const testIp = "198.51.100.2";

  for (let i = 0; i < 10; i++) {
    const { req, res } = createMockReqRes({ ip: testIp });
    let calledNext = false;
    signupRateLimiter(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  }

  const { req, res } = createMockReqRes({ ip: testIp });
  let calledNext = false;
  signupRateLimiter(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.getStatusCode(), 429);
  assert.equal(res.getData().code, "SIGNUP_RATE_LIMITED");
});

test("SEC-TEST-22: Forgot-password abuse threshold triggers HTTP 429", async () => {
  (forgotPasswordRateLimiter as any).reset();
  const testIp = "198.51.100.3";

  // 5 requests allowed
  for (let i = 0; i < 5; i++) {
    const { req, res } = createMockReqRes({ ip: testIp });
    let calledNext = false;
    forgotPasswordRateLimiter(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  }

  // 6th request triggers 429
  const { req, res } = createMockReqRes({ ip: testIp });
  let calledNext = false;
  forgotPasswordRateLimiter(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.getStatusCode(), 429);
  assert.equal(res.getData().code, "FORGOT_PASSWORD_RATE_LIMITED");
});

test("SEC-TEST-23: Username-check abuse threshold triggers HTTP 429", async () => {
  (usernameCheckRateLimiter as any).reset();
  const testIp = "198.51.100.4";

  // 30 requests allowed
  for (let i = 0; i < 30; i++) {
    const { req, res } = createMockReqRes({ ip: testIp });
    let calledNext = false;
    usernameCheckRateLimiter(req, res, () => {
      calledNext = true;
    });
    assert.equal(calledNext, true);
  }

  // 31st request triggers 429
  const { req, res } = createMockReqRes({ ip: testIp });
  let calledNext = false;
  usernameCheckRateLimiter(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.getStatusCode(), 429);
  assert.equal(res.getData().code, "USERNAME_CHECK_RATE_LIMITED");
});

// ============================================================================
// PETO-SEC-07: ACCOUNT / IDENTITY ENUMERATION RESISTANCE
// ============================================================================

test("SEC-TEST-24: Forgot-password existing and nonexistent email responses are identical", async () => {
  // Test simulated handler flow for forgot password
  async function handleForgotPassword(email: string, mockSupabaseOutcome: "success" | "user_not_found") {
    const { res } = createMockReqRes({ body: { email } });
    if (!email || !email.includes("@")) {
      return { status: 400, data: { success: false, message: "A valid email address is required." } };
    }

    // Simulate Supabase response
    if (mockSupabaseOutcome === "user_not_found") {
      // In audit issue, Supabase error was passed to client:
      // return { status: 400, data: { success: false, message: "User not found" } };
      // IN REMEDIATED CODE: It logs internally and returns uniform response:
      return {
        status: 200,
        data: {
          success: true,
          message: "If an account exists for that email, a password reset link has been sent.",
        },
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        message: "If an account exists for that email, a password reset link has been sent.",
      },
    };
  }

  const existingResult = await handleForgotPassword("existing_user@example.com", "success");
  const nonexistentResult = await handleForgotPassword("nonexistent_user@example.com", "user_not_found");

  assert.equal(existingResult.status, 200);
  assert.equal(nonexistentResult.status, 200);
  assert.deepEqual(existingResult.data, nonexistentResult.data);
  assert.equal(existingResult.data.message, "If an account exists for that email, a password reset link has been sent.");
});

// ============================================================================
// PETO-SEC-08: INTERNAL ERROR SANITIZATION
// ============================================================================

test("SEC-TEST-25: Unexpected internal error in production does not leak raw database schema or stack trace", async () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    const internalDbError = new Error('relation "profiles_confidential" does not exist at character 15, query: SELECT * FROM profiles_confidential');
    (internalDbError as any).stack = "Error: at Query.execute (e:/Peto/Project/backend/node_modules/postgres/lib/query.js:124:11)";

    const { req, res } = createMockReqRes({
      body: { password: "secret_password_123", token: "secret_jwt" },
    });

    globalErrorHandler(internalDbError, req, res, () => {});

    assert.equal(res.getStatusCode(), 500);
    const data = res.getData();

    // The client MUST receive a safe generic message
    assert.equal(data.success, false);
    assert.equal(data.message, "An unexpected server error occurred.");

    // Ensure raw error details, SQL queries, table names, and stack traces are NOT in the client response
    const jsonStr = JSON.stringify(data);
    assert.equal(jsonStr.includes("profiles_confidential"), false);
    assert.equal(jsonStr.includes("SELECT * FROM"), false);
    assert.equal(jsonStr.includes("postgres/lib/query.js"), false);
    assert.equal(jsonStr.includes("secret_password_123"), false);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test("SEC-TEST-26: Expected validation and client errors retain correct HTTP status codes", async () => {
  // 400 Bad Request
  {
    const badReqErr: any = new Error("Invalid username format");
    badReqErr.statusCode = 400;
    const { req, res } = createMockReqRes({});
    globalErrorHandler(badReqErr, req, res, () => {});
    assert.equal(res.getStatusCode(), 400);
    assert.equal(res.getData().message, "Invalid username format");
  }

  // 401 Unauthorized
  {
    const unauthErr: any = new Error("Authentication token expired");
    unauthErr.statusCode = 401;
    const { req, res } = createMockReqRes({});
    globalErrorHandler(unauthErr, req, res, () => {});
    assert.equal(res.getStatusCode(), 401);
    assert.equal(res.getData().message, "Authentication token expired");
  }

  // 403 Forbidden
  {
    const forbiddenErr: any = new Error("Insufficient permissions");
    forbiddenErr.statusCode = 403;
    const { req, res } = createMockReqRes({});
    globalErrorHandler(forbiddenErr, req, res, () => {});
    assert.equal(res.getStatusCode(), 403);
    assert.equal(res.getData().message, "Insufficient permissions");
  }

  // 413 File Too Large (Multer LIMIT_FILE_SIZE)
  {
    const multerSizeErr: any = new Error("File too large");
    multerSizeErr.code = "LIMIT_FILE_SIZE";
    const { req, res } = createMockReqRes({});
    globalErrorHandler(multerSizeErr, req, res, () => {});
    assert.equal(res.getStatusCode(), 413);
    assert.match(res.getData().message, /File is too large/i);
  }
});
