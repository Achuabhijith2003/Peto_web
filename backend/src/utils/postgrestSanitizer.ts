/**
 * Centralized PostgREST Search Filter Sanitizer & Safe Query Builder (PETO-SEC-17)
 * 
 * Sanitizes user search input and builds safe PostgREST logic tree expressions.
 * Ensures search parameters are treated strictly as data literals inside
 * PostgREST double-quoted operand grammar, preventing AST injection, delimiter
 * splitting, and unhandled parser errors.
 */

export function sanitizeSearchQuery(input?: string | null, maxLength = 100): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // 1. Trim and slice to bounded length to prevent DoS via excessive memory/regex
  let clean = input.trim().slice(0, maxLength);

  // 2. Remove SQL comment markers to prevent WAF trips or syntax confusion
  clean = clean.replace(/--|\/\*|\*\//g, " ");

  // 3. Strip backslashes and carriage/line feeds
  clean = clean.replace(/[\r\n\t\\]/g, " ");

  // 4. Prevent wildcard flooding (e.g., "%%%%%%" causing high database load)
  clean = clean.replace(/%{2,}/g, "%");

  // 5. Escape double quotes for PostgREST double-quoted operands
  clean = clean.replace(/"/g, '""');

  // 6. Collapse internal whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}

/**
 * Builds a safe PostgREST .or() ilike clause for multiple columns:
 * e.g. buildPostgrestOrIlike(['username', 'full_name'], query)
 * returns: 'username.ilike."%sanitized%",full_name.ilike."%sanitized%"'
 * or null if the sanitized query is empty.
 */
export function buildPostgrestOrIlike(
  columns: string[],
  rawQuery?: string | null,
  maxLength = 100
): string | null {
  const sanitized = sanitizeSearchQuery(rawQuery, maxLength);
  if (!sanitized) {
    return null;
  }

  return columns
    .map((col) => `${col}.ilike."%${sanitized}%"`)
    .join(",");
}
