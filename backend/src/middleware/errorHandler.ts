import { Request, Response, NextFunction } from "express";

export interface CustomAppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  expose?: boolean;
}

/**
 * Global Error Handling Middleware (PETO-SEC-08)
 * - Returns sanitized, generic error responses in production to prevent schema, table, and stack leakage.
 * - Preserves expected client HTTP status codes (400, 401, 403, 404, 409, 413, 422, 429).
 * - Maintains rich server-side diagnostic logging while filtering sensitive credential fields.
 */
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If headers have already been sent to client, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // PETO-SEC-18: PostgreSQL 22P02 (invalid input syntax for type uuid)
  if (
    err?.code === "22P02" ||
    (typeof err?.message === "string" && err.message.includes("invalid input syntax for type uuid"))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid resource identifier format.",
      code: "INVALID_UUID",
    });
  }

  // 1. Specific upload limit errors
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File is too large. Maximum size is 30MB for images and 200MB for videos.",
    });
  }

  // 2. Client connection aborts during upload
  if (err?.message === "Request aborted" || err?.code === "ECONNRESET") {
    console.warn("Upload connection was interrupted/aborted by client:", err.message);
    return res.status(499).json({
      success: false,
      message: "Upload connection was interrupted.",
    });
  }

  // 3. Multer errors or file filter errors
  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error.",
    });
  }

  if (
    typeof err?.message === "string" &&
    (err.message.includes("Unsupported image format") ||
      err.message.includes("Invalid video format") ||
      err.message.includes("Unsupported file format") ||
      err.message.includes("Security validation error"))
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // 4. Expected application errors (4xx HTTP statuses)
  const statusCode = Number(err?.statusCode || err?.status);
  if (!isNaN(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      message: err.message || "Client error",
      code: err.code || undefined,
    });
  }

  // 5. Server-side diagnostic logging for unexpected internal errors (500)
  // Sanitize any sensitive credentials from logged request information
  const sanitizedBody = req.body ? { ...req.body } : {};
  const sensitiveKeys = [
    "password",
    "token",
    "refreshToken",
    "secret",
    "key_secret",
    "code",
    "razorpay_signature",
  ];
  for (const key of sensitiveKeys) {
    if (sanitizedBody[key]) {
      sanitizedBody[key] = "[REDACTED]";
    }
  }

  console.error("Internal Server Error:", {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    error: err?.message || err,
    stack: err?.stack,
    sanitizedBody,
  });

  // 6. Production response sanitization (PETO-SEC-08)
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }

  // Development/Test fallback
  return res.status(500).json({
    success: false,
    message: err?.message || "Internal Server Error",
  });
}
