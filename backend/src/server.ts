import "dotenv/config";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import authRoutes from "./auth/auth.routes";
import userRoutes from "./users/user.routes";

// Register routes


const app = express();

const PORT = Number(process.env.PORT) || 5000;

// ----------------------
// Security
// ----------------------

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ----------------------
// CORS
// ----------------------

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use(morgan("dev"));

// ----------------------
// Health Check
// ----------------------

app.get("/health", (_, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
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
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
);

// ----------------------
// Start Server 
// ----------------------

app.listen(PORT, () => {
  console.log("");
  console.log("====================================");
  console.log("🚀 Peto Backend Started");
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server      : http://localhost:${PORT}`);
  console.log(`❤️ Health      : http://localhost:${PORT}/health`);
  console.log("====================================");
});