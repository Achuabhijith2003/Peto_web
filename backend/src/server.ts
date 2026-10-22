import "dotenv/config";

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import authRoutes from "./auth/auth.routes";
import userRoutes from "./users/user.routes";
import mediaRoutes from "./media/media.routes";
import postRoutes from "./posts/post.routes";
import likeRoutes from "./likes/like.routes";
import commentRoutes from "./comments/comment.routes";
import bookmarkRoutes from "./bookmarks/bookmark.routes";
import followRoutes from "./followers/follow.routes";
import presenceRoutes from "./presence/presence.routes";
import notificationRoutes from "./notifications/notification.routes";
import communityRoutes from "./communities/community.routes";
import adminRoutes from "./admin/admin.routes";
import reportRoutes from "./reports/report.routes";
import publicAdsRoutes from "./ads/ads.public.routes";
import regionalRoutes from "./regions/regional.routes";
import paymentRoutes from "./payments/payment.routes";
import advertiserRoutes from "./advertisers/advertiser.routes";
import publicPolicyRoutes from "./routes/publicPolicy.routes";
import complianceRoutes from "./routes/compliance.routes";
import petRoutes from "./pets/pet.routes";
import verificationRoutes from "./advertisers/verification/identityVerification.routes";
import businessRoutes from "./businesses/business.routes";
import { ensurePublicBuckets } from "./media/storage.service";
import { telemetryMiddleware } from "./middleware/telemetry.middleware";
import { maintenanceMiddleware, getCachedMaintenanceState } from "./middleware/maintenance.middleware";
import { globalErrorHandler } from "./middleware/errorHandler";
import { corsOptions } from "./config/cors";



// Register routes


const app = express();

const PORT = Number(process.env.PORT) || 5000;

// ----------------------
// Security
// ----------------------

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://checkout.razorpay.com",
          "https://*.razorpay.com",
          "https://pagead2.googlesyndication.com",
          "https://*.googlesyndication.com",
          "https://www.googletagservices.com",
          "https://adservice.google.com",
          "https://*.google.com",
          "https://*.doubleclick.net",
          "https://googleads.g.doubleclick.net",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "https://*.google.com",
          "https://*.googlesyndication.com",
          "https://*.doubleclick.net",
        ],
        mediaSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https:",
          "http://localhost:*",
          "ws://localhost:*",
          "https://*.razorpay.com",
          "https://api.razorpay.com",
          "https://lumberjack.razorpay.com",
          "https://pagead2.googlesyndication.com",
          "https://*.googlesyndication.com",
          "https://*.google.com",
          "https://*.doubleclick.net",
          "https://googleads.g.doubleclick.net",
        ],
        frameSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
          "https://*.razorpay.com",
          "https://pagead2.googlesyndication.com",
          "https://*.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://*.google.com",
          "https://*.doubleclick.net",
        ],
      },
    },
  })
);

// ----------------------
// CORS (PETO-SEC-09)
// ----------------------

app.use(cors(corsOptions));

// ----------------------
// Middlewares
// ----------------------

app.use(compression());
app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// High-Precision Telemetry & Live Request Monitoring
app.use(telemetryMiddleware);

// Controlled Maintenance Mode (Circuit-breaker for client traffic)
app.use(maintenanceMiddleware);

// ----------------------
// Routes
// ----------------------

app.use("/api/auth", authRoutes);

app.use("/api/users", followRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", followRoutes);

app.use("/api/posts", postRoutes);

app.use("/api/media", mediaRoutes);

app.use("/api/communities", communityRoutes);

app.use("/api/admin", adminRoutes);

app.use(
    "/api/presence",
    presenceRoutes
);

app.use("/api", likeRoutes);
app.use("/api", commentRoutes);
app.use("/api", bookmarkRoutes);
app.use("/api/my", bookmarkRoutes);
app.use(
    "/api/notifications",
    notificationRoutes
);

app.use("/api/reports", reportRoutes);
app.use("/api/ads", publicAdsRoutes);
app.use("/api/regions", regionalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/advertisers", advertiserRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/policies", publicPolicyRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/pet", petRoutes);

app.use(morgan("dev"));

// ----------------------
// Health Check
// ----------------------

app.get("/health", (_, res) => {
  const maintenance = getCachedMaintenanceState();
  res.status(200).json({
    success: true,
    status: maintenance.is_enabled ? "MAINTENANCE" : "OK",
    maintenance: maintenance.is_enabled,
    message: maintenance.is_enabled ? maintenance.message : undefined,
    enabled_at: maintenance.is_enabled ? maintenance.enabled_at : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ----------------------
// API
// ----------------------

app.get("/api", (_, res) => {
  res.json({
    name: "Peto API",
    version: "1.0.0",
    status: "Running",
  });
});

app.get("/api/app-config", (_, res) => {
  const rawUrl =
    process.env.PLAY_STORE_URL ||
    process.env.VITE_PLAY_STORE_URL ||
    process.env.ANDROID_PLAY_STORE_URL ||
    "";

  const trimmed = rawUrl.trim();
  res.json({
    success: true,
    playStoreUrl: trimmed && /^(https?:\/\/|market:\/\/)/i.test(trimmed) ? trimmed : null,
  });
});

// ----------------------
// Frontend Serving
// ----------------------

const frontendPath = path.join(__dirname, "../../Frontend/Peto_user/dist");
const indexHtmlPath = path.join(frontendPath, "index.html");

if (fs.existsSync(indexHtmlPath)) {
  // Prevent serving raw index.html directly from static so the injection middleware intercepts HTML requests
  app.use(express.static(frontendPath, { index: false }));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.originalUrl.startsWith("/api")) {
      return next();
    }
    try {
      let html = fs.readFileSync(indexHtmlPath, "utf-8");

      // Inject runtime Supabase configuration matching the active backend environment
      const runtimeConfig = {
        VITE_SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
      };

      if (runtimeConfig.VITE_SUPABASE_URL) {
        const injection = `<script id="peto-runtime-config">window.__PETO_CONFIG__=Object.freeze(${JSON.stringify(runtimeConfig)});</script>`;
        if (html.includes("</head>")) {
          html = html.replace("</head>", `${injection}</head>`);
        } else {
          html = injection + html;
        }
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch {
      return res.sendFile(indexHtmlPath);
    }
  });
}

// ----------------------
// 404
// ----------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ----------------------
// Global Error Handler (PETO-SEC-08)
// ----------------------

app.use(globalErrorHandler);

// ----------------------
// Start Server 
// ----------------------

import { ensurePrivateVerificationBucket } from "./media/secureStorage.service";
import { ensurePetMediaPrivateBucket } from "./media/petStorage.service";
import { initRedis, closeRedis } from "./config/redis";

const server = app.listen(PORT, async () => {
  ensurePublicBuckets();
  ensurePrivateVerificationBucket();
  ensurePetMediaPrivateBucket();
  await initRedis(); // Non-blocking background Redis initialization and diagnostics
  console.log("");
  console.log("====================================");
  console.log("🚀 Peto Backend Started");
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server      : http://localhost:${PORT}`);
  console.log(`❤️ Health      : http://localhost:${PORT}/health`);
  console.log("====================================");
});

// Configure 5-minute timeout for large media/video uploads
server.setTimeout(300000);
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000; // Strictly greater than keepAliveTimeout
server.requestTimeout = 300000; // 5 minutes request timeout

const handleShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}, closing connections...`);
  await closeRedis();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));