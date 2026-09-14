/**
 * PostgREST Search Filter Sanitizer
 * Prevents filter injection, AST manipulation, and unexpected syntax errors
 * when constructing dynamic PostgREST .or() filter expressions.
 */
export function sanitizeSearchQuery(input?: string | null, maxLength = 100): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // 1. Trim and slice to bounded length to prevent DoS via regex/string allocation
  let clean = input.trim().slice(0, maxLength);

  // 2. Strip characters with syntactic meaning in PostgREST .or() AST:
  // Commas separate conditions; parentheses denote grouped expressions;
  // backslashes and semicolons can be used in path traversal/command injection.
  clean = clean.replace(/[,();\\`"']/g, " ");

  // 3. Prevent wildcard flooding (e.g. "%%%%%%" causing high DB query degradation)
  clean = clean.replace(/%{2,}/g, "%");

  // 4. Collapse whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}
