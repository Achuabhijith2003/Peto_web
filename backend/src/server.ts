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
import { ensurePublicBuckets } from "./media/storage.service";
import { telemetryMiddleware } from "./middleware/telemetry.middleware";
import { maintenanceMiddleware, getCachedMaintenanceState } from "./middleware/maintenance.middleware";



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
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https:",
          "http://localhost:*",
          "ws://localhost:*",
          "https://*.razorpay.com",
          "https://api.razorpay.com",
          "https://lumberjack.razorpay.com",
        ],
        frameSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
          "https://*.razorpay.com",
        ],
      },
    },
  })
);

// ----------------------
// CORS
// ----------------------

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  process.env.ADMIN_CLIENT_URL || "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

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

// ----------------------
// Frontend Serving
// ----------------------

const frontendPath = path.join(__dirname, "../../Frontend/Peto_user/dist");
const indexHtmlPath = path.join(frontendPath, "index.html");

if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(frontendPath));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(indexHtmlPath);
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
// Global Error Handler
// ----------------------

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File is too large. Maximum size is 30MB for images and 200MB for videos.",
      });
    }

    if (err?.message === "Request aborted" || err?.code === "ECONNRESET") {
      console.warn("Upload connection was interrupted/aborted by client:", err.message);
      return res.status(499).json({
        success: false,
        message: "Upload connection was interrupted.",
      });
    }

    console.error(err);

    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error",
    });
  }
);

// ----------------------
// Start Server 
// ----------------------

import { ensurePrivateVerificationBucket } from "./media/secureStorage.service";

const server = app.listen(PORT, () => {
  ensurePublicBuckets();
  ensurePrivateVerificationBucket();
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