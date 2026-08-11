import { parse } from "csv-parse/sync";

export function parseCsv(text: string): Record<string, string>[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export function toBool(value: string | undefined): boolean {
  if (!value) return false;
  return ["y", "yes", "true", "1", "ใช่", "มี"].includes(value.trim().toLowerCase());
}

export function toNumberOrNull(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
