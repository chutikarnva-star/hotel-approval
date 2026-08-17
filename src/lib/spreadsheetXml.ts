// Builds a multi-tab Excel file as SpreadsheetML (Excel 2003 XML) — the same
// format Choowap's own exports use (see src/lib/choowapImport.ts) — so we can
// produce a real multi-sheet workbook without adding an xlsx dependency.
export interface WorkbookSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellXml(value: string | number | null): string {
  if (value == null) return "<Cell></Cell>";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

export function buildWorkbookXml(sheets: WorkbookSheet[]): string {
  const worksheets = sheets
    .map((sheet) => {
      const headerRow = `<Row>${sheet.headers.map((h) => cellXml(h)).join("")}</Row>`;
      const dataRows = sheet.rows.map((row) => `<Row>${row.map((v) => cellXml(v)).join("")}</Row>`).join("");
      return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${worksheets}
</Workbook>`;
}

export function downloadWorkbook(sheets: WorkbookSheet[], filename: string): void {
  const xml = buildWorkbookXml(sheets);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
