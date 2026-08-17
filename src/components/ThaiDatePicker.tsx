"use client";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const DAYS = Array.from({ length: 31 }, (_, i) => pad2(i + 1));
const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 1 + i);

function parseDate(value: string) {
  const [year, month, day] = value ? value.split("-") : ["", "", ""];
  return { year: year ?? "", month: month ?? "", day: day ?? "" };
}

export function ThaiDateSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { year, month, day } = parseDate(value);

  function emit(next: { year: string; month: string; day: string }) {
    onChange(next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : "");
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select value={day} onChange={(e) => emit({ year, month, day: e.target.value })}>
        <option value="">วัน</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select value={month} onChange={(e) => emit({ year, month: e.target.value, day })}>
        <option value="">เดือน</option>
        {THAI_MONTHS.map((name, i) => (
          <option key={name} value={pad2(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select value={year} onChange={(e) => emit({ year: e.target.value, month, day })}>
        <option value="">ปี</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ThaiDateTimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const [hour, minute] = timePart ? timePart.split(":") : ["", ""];

  function emitDate(nextDate: string) {
    onChange(nextDate && hour && minute ? `${nextDate}T${hour}:${minute}` : "");
  }

  function emitTime(nextHour: string, nextMinute: string) {
    onChange(datePart && nextHour && nextMinute ? `${datePart}T${nextHour}:${nextMinute}` : "");
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <ThaiDateSelect value={datePart ?? ""} onChange={emitDate} />
      <select value={hour ?? ""} onChange={(e) => emitTime(e.target.value, minute ?? "")}>
        <option value="">ชม.</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span>:</span>
      <select value={minute ?? ""} onChange={(e) => emitTime(hour ?? "", e.target.value)}>
        <option value="">นาที</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
