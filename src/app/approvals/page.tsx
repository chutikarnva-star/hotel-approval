"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface ApprovalRow {
  id: string;
  requestCode: string;
  requestDate: string;
  employee: { name: string; code: string };
  destinationBranch: { name: string };
  selectedHotel: { name: string } | null;
  otherHotelName: string | null;
  choowapBookedAt: string | null;
  choowapBookingCode: string | null;
  pricePerNight: number | null;
  budgetPerNight: number | null;
  priceDiff: number | null;
  guestWillingToPayDiff: boolean | null;
  otherReasonText: string | null;
  isTravelTimeOverOneHour: boolean | null;
  travelTimeEvidenceUrl: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  statusFlag: "GREEN" | "YELLOW" | "RED" | null;
  approverAction: "PENDING" | "APPROVED" | "REJECTED";
}

interface Summary {
  total: number;
  green: number;
  yellow: number;
  red: number;
  pending: number;
}

export default function ApprovalsPage() {
  return (
    <AuthGate>
      <div className="container">
        <ApprovalsList />
      </div>
    </AuthGate>
  );
}

function ApprovalsList() {
  const { idToken } = useAuth();
  const [requests, setRequests] = useState<ApprovalRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/approvals");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    const data = await res.json();
    setRequests(data.requests);
    setSummary(data.summary);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  async function decide(id: string, action: "APPROVED" | "REJECTED") {
    setBusyId(id);
    await apiFetch(idToken, `/api/requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    load();
  }

  if (error) return <p style={{ color: "var(--red)" }}>{error}</p>;

  return (
    <div>
      <h1>คำขอที่พักรอการอนุมัติ</h1>

      {summary && (
        <div className="stat-row" style={{ marginBottom: 16 }}>
          <Stat label="ทั้งหมด" value={summary.total} />
          <Stat label="เขียว - อนุมัติได้ทันที" value={summary.green} color="var(--green)" />
          <Stat label="เหลือง - ตรวจสอบเหตุผล" value={summary.yellow} color="var(--yellow)" />
          <Stat label="แดง - ขอข้อมูลเพิ่มเติม" value={summary.red} color="var(--red)" />
        </div>
      )}

      {requests?.filter((r) => r.approverAction === "PENDING").map((r) => (
        <div key={r.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{r.requestCode}</strong>
            {r.statusFlag && <span className={`badge ${r.statusFlag}`}>{r.statusFlag}</span>}
          </div>
          <p style={{ margin: "6px 0" }}>
            ผู้ขอ: {r.employee.name} ({r.employee.code})
            <br />
            สาขา: {r.destinationBranch.name}
            <br />
            โรงแรม: {r.selectedHotel?.name ?? r.otherHotelName ?? "-"}
            <br />
            จองใน Choowap: {r.choowapBookedAt ? new Date(r.choowapBookedAt).toLocaleString("th-TH") : "-"}
            {r.choowapBookingCode && ` · เลขที่การจอง ${r.choowapBookingCode}`}
            <br />
            ราคา {r.pricePerNight ?? "-"} บาท/คืน · งบ {r.budgetPerNight ?? "-"} บาท
            {r.priceDiff ? ` · เกินงบ ${r.priceDiff} บาท (${r.guestWillingToPayDiff ? "ยินดีจ่ายส่วนต่าง" : "ยังไม่ยืนยัน"})` : ""}
            <br />
            เข้าพัก {r.checkInDate?.slice(0, 10)} — {r.checkOutDate?.slice(0, 10)}
            {r.otherReasonText && (
              <>
                <br />
                เหตุผลอื่น: {r.otherReasonText}
              </>
            )}
            {r.isTravelTimeOverOneHour && r.travelTimeEvidenceUrl && (
              <>
                <br />
                เดินทางเกิน 1 ชม.:{" "}
                <a href={r.travelTimeEvidenceUrl} target="_blank" rel="noreferrer">
                  ตรวจสอบใน Google Maps
                </a>
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" disabled={busyId === r.id} onClick={() => decide(r.id, "APPROVED")}>
              อนุมัติ
            </button>
            <button className="btn danger" disabled={busyId === r.id} onClick={() => decide(r.id, "REJECTED")}>
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      ))}

      {requests?.filter((r) => r.approverAction === "PENDING").length === 0 && (
        <p className="field-hint">ไม่มีคำขอรออนุมัติ</p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="stat-tile">
      <div className="num" style={{ color }}>{value}</div>
      <div className="field-hint">{label}</div>
    </div>
  );
}
