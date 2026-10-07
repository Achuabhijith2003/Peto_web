import { Request, Response, NextFunction } from "express";

/**
 * Standard RFC 4122 UUID v1-v5 regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: any): boolean {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

export interface ValidateUuidOptions {
  opaqueNotFound?: boolean;
}

/**
 * Reusable Express Middleware: Validate UUID Route Parameters (PETO-SEC-18)
 * 
 * Intercepts malformed or non-UUID route parameters BEFORE any database query executes.
 * Prevents PostgreSQL 22P02 syntax exceptions and unhandled HTTP 500 errors.
 * Returns controlled HTTP 400 Bad Request (or opaque HTTP 404 when concealment is configured).
 */
export function validateUuidParams(
  paramNames: string | string[],
  options: ValidateUuidOptions = {}
) {
  const names = Array.isArray(paramNames) ? paramNames : [paramNames];

  return (req: Request, res: Response, next: NextFunction) => {
    for (const name of names) {
      const val = req.params[name];
      if (val !== undefined && !isValidUuid(val)) {
        if (options.opaqueNotFound) {
          return res.status(404).json({
            success: false,
            message: "Resource not found.",
          });
        }

        return res.status(400).json({
          success: false,
          message: `Invalid identifier format for parameter '${name}'. Must be a valid UUID.`,
          code: "INVALID_UUID",
        });
      }
    }
    next();
  };
}
