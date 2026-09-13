/**
 * Modular Export Service
 * Formats analytics datasets into standard RFC 4180 CSV strings.
 * Extensible for future formats (JSON, XLSX, PDF).
 */

export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Extract all unique headers from all objects
  const headers: string[] = Array.from(
    new Set<string>(
      data.reduce((keys: string[], item: any) => {
        return keys.concat(Object.keys(item));
      }, [])
    )
  );

  const escapeCSVCell = (val: any): string => {
    if (val === null || val === undefined) return "";
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSVCell).join(",");
  const rows = data.map((item) => {
    return headers.map((header) => escapeCSVCell(item[header])).join(",");
  });

  return [headerRow, ...rows].join("\r\n");
}

export function formatFilename(section: string, format: string = "csv"): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const safeSection = section.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `peto-analytics-${safeSection}-${dateStr}.${format}`;
}
