// src/utils/exportCsv.ts

/**
 * Internal: build CSV string from headers + rows.
 */
export function buildCsvString(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";

  const escapeCell = (value: string): string => {
    const s = value ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(","));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }

  return lines.join("\n");
}

/**
 * Simple CSV exporter.
 *
 * @param filename  Name of the downloaded file (e.g. "visitor_logs.csv")
 * @param headers   Header row (array of column titles)
 * @param rows      2D array of rows -> columns as strings
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  if (rows.length === 0) return;

  const csv = buildCsvString(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
