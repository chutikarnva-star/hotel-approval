"use client";

import { useEffect, useState } from "react";

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

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateValue(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(value: string) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return `${pad2(parsed.day)}/${pad2(parsed.month + 1)}/${parsed.year}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function CalendarPopup({
  year,
  month,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="thai-calendar-popup" onMouseDown={(e) => e.stopPropagation()}>
      <div className="thai-calendar-header">
        <button type="button" onClick={onPrevMonth} aria-label="เดือนก่อนหน้า">
          ‹
        </button>
        <span>
          {THAI_MONTHS[month]} {year}
        </span>
        <button type="button" onClick={onNextMonth} aria-label="เดือนถัดไป">
          ›
        </button>
      </div>
      <div className="thai-calendar-weekdays">
        {THAI_WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="thai-calendar-days">
        {cells.map((d, i) =>
          d === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              type="button"
              key={d}
              className={d === selectedDay ? "selected" : ""}
              onClick={() => onSelectDay(d)}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function ThaiDateSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseDateValue(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  useEffect(() => {
    const p = parseDateValue(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  function selectDay(day: number) {
    onChange(`${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="thai-date-trigger" onClick={() => setOpen((o) => !o)}>
        <span style={{ color: value ? "inherit" : "var(--muted)" }}>
          {value ? formatDisplay(value) : "วว/ดด/ปปปป"}
        </span>
        <span aria-hidden>📅</span>
      </button>
      {open && (
        <>
          <div className="thai-calendar-backdrop" onClick={() => setOpen(false)} />
          <CalendarPopup
            year={viewYear}
            month={viewMonth}
            selectedDay={parsed && parsed.year === viewYear && parsed.month === viewMonth ? parsed.day : null}
            onSelectDay={selectDay}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
        </>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));

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
    onChange(nextDate && hour && minute ? `${nextDate}T${hour}:${minute}` : nextDate ? `${nextDate}T00:00` : "");
  }

  function emitTime(nextHour: string, nextMinute: string) {
    onChange(datePart && nextHour && nextMinute ? `${datePart}T${nextHour}:${nextMinute}` : "");
  }

  return (
    <div className="thai-date-time-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <ThaiDateSelect value={datePart ?? ""} onChange={emitDate} />
      <select
        className="thai-time-select"
        value={hour ?? ""}
        onChange={(e) => emitTime(e.target.value, minute || "00")}
      >
        <option value="">ชม.</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span>:</span>
      <select
        className="thai-time-select"
        value={minute ?? ""}
        onChange={(e) => emitTime(hour || "00", e.target.value)}
      >
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
