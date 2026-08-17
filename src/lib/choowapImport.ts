// Parses the "Report-CJMart-*.xls" export from Choowap, which is actually
// Excel 2003 SpreadsheetML (an XML format), not a binary .xls file.
// Column layout (0-indexed), fixed by Choowap's own export template:
//   0 Booking No.   1 Date (submission timestamp, DD-MM-YYYY HH:mm)
//   10 Staff code (comma-separated codes of everyone sharing that room)
const COL_BOOKING_NO = 0;
const COL_DATE = 1;
const COL_STAFF_CODES = 10;
const EXPECTED_COLUMN_COUNT = 29;

export interface ChoowapBookingRow {
  bookingNo: string;
  submittedAt: { year: number; month: number; day: number; hour: number; minute: number };
  staffCodes: string[];
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseChoowapDate(value: string): ChoowapBookingRow["submittedAt"] | null {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
}

export function parseChoowapWorkbook(xml: string): ChoowapBookingRow[] {
  const rowBlocks = xml.split("<Row>").slice(2); // [0] is pre-table content, [1] is the header row
  const rows: ChoowapBookingRow[] = [];

  for (const block of rowBlocks) {
    const cells = [...block.matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/g)].map((m) => unescapeXml(m[1]).trim());
    if (cells.length !== EXPECTED_COLUMN_COUNT) continue;

    const submittedAt = parseChoowapDate(cells[COL_DATE]);
    const bookingNo = cells[COL_BOOKING_NO];
    if (!submittedAt || !bookingNo) continue;

    rows.push({
      bookingNo,
      submittedAt,
      staffCodes: cells[COL_STAFF_CODES].split(",").map((c) => c.trim()).filter(Boolean),
    });
  }

  return rows;
}

function toBangkokParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") === 24 ? 0 : get("hour"), minute: get("minute") };
}

function sameMinute(a: ChoowapBookingRow["submittedAt"], b: ChoowapBookingRow["submittedAt"]): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;
}

export interface MatchResult {
  bookingNo: string | null;
  ambiguous: boolean;
}

// Finds the Choowap booking number for one employee's request, matching on
// "this employee's code appears in the room's staff list" AND "the booking's
// submission timestamp is the same minute the employee recorded in our app."
export function matchBooking(
  rows: ChoowapBookingRow[],
  employeeCode: string,
  choowapBookedAt: Date
): MatchResult {
  const bookedAtParts = toBangkokParts(choowapBookedAt);
  const matches = rows.filter(
    (r) => r.staffCodes.includes(employeeCode) && sameMinute(r.submittedAt, bookedAtParts)
  );
  const distinctBookingNos = new Set(matches.map((m) => m.bookingNo));

  if (distinctBookingNos.size === 0) return { bookingNo: null, ambiguous: false };
  if (distinctBookingNos.size === 1) return { bookingNo: matches[0].bookingNo, ambiguous: false };
  return { bookingNo: null, ambiguous: true };
}
