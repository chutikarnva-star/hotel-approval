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
  guestCount: number | null;
  roomCount: number | null;
  soloGuestReason: string | null;
  statusFlag: "GREEN" | "YELLOW" | "RED" | null;
  checkReason: string | null;
  approverAction: "PENDING" | "APPROVED" | "REJECTED";
  approverActionAt: string | null;
  approverComment: string | null;
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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

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

  async function decide(id: string, action: "APPROVED" | "REJECTED", comment?: string) {
    setBusyId(id);
    const res = await apiFetch(idToken, `/api/requests/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ action, comment }),
    });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setRejectError(d.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    setRejectingId(null);
    setRejectReason("");
    setRejectError(null);
    load();
  }

  function confirmReject(id: string) {
    if (!rejectReason.trim()) {
      setRejectError("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }
    decide(id, "REJECTED", rejectReason);
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
          {(r.statusFlag === "RED" || r.statusFlag === "YELLOW") && r.checkReason && (
            <p
              style={{
                margin: "10px 0",
                padding: "10px 12px",
                borderRadius: 8,
                fontWeight: 600,
                background: r.statusFlag === "RED" ? "var(--red-bg)" : "var(--yellow-bg)",
                color: r.statusFlag === "RED" ? "var(--red)" : "var(--yellow)",
              }}
            >
              ต้องตรวจสอบ: {r.checkReason}
            </p>
          )}
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
            <br />
            ผู้เข้าพัก {r.guestCount ?? "-"} คน · {r.roomCount ?? "-"} ห้อง
            {r.guestCount === 1 && r.soloGuestReason && ` · เหตุผลที่พักคนเดียว: ${r.soloGuestReason}`}
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

          {rejectingId === r.id ? (
            <div style={{ marginTop: 10 }}>
              <label>เหตุผลที่ไม่อนุมัติ</label>
              <input
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError(null);
                }}
                placeholder="ระบุเหตุผลที่ไม่อนุมัติคำขอนี้"
              />
              {rejectError && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 4 }}>{rejectError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn danger" disabled={busyId === r.id} onClick={() => confirmReject(r.id)}>
                  ยืนยันไม่อนุมัติ
                </button>
                <button
                  className="btn secondary"
                  disabled={busyId === r.id}
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                    setRejectError(null);
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" disabled={busyId === r.id} onClick={() => decide(r.id, "APPROVED")}>
                อนุมัติ
              </button>
              <button
                className="btn danger"
                disabled={busyId === r.id}
                onClick={() => {
                  setRejectingId(r.id);
                  setRejectReason("");
                  setRejectError(null);
                }}
              >
                ไม่อนุมัติ
              </button>
            </div>
          )}
        </div>
      ))}

      {requests?.filter((r) => r.approverAction === "PENDING").length === 0 && (
        <p className="field-hint">ไม่มีคำขอรออนุมัติ</p>
      )}

      <ApprovalHistory requests={requests} />
    </div>
  );
}

function ApprovalHistory({ requests }: { requests: ApprovalRow[] | null }) {
  const decided = (requests ?? [])
    .filter((r) => r.approverAction !== "PENDING")
    .sort((a, b) => new Date(b.approverActionAt ?? 0).getTime() - new Date(a.approverActionAt ?? 0).getTime());

  if (decided.length === 0) return null;

  return (
    <div className="card" style={{ overflowX: "auto", marginTop: 24 }}>
      <h3>ประวัติการอนุมัติ</h3>
      <table>
        <thead>
          <tr>
            <th>รหัสคำขอ</th>
            <th>ผู้ขอ</th>
            <th>สาขา</th>
            <th>โรงแรม</th>
            <th>ผลการพิจารณา</th>
            <th>วันที่กดอนุมัติ</th>
          </tr>
        </thead>
        <tbody>
          {decided.map((r) => (
            <tr key={r.id}>
              <td>{r.requestCode}</td>
              <td>{r.employee.name}</td>
              <td>{r.destinationBranch.name}</td>
              <td>{r.selectedHotel?.name ?? r.otherHotelName ?? "-"}</td>
              <td>
                <span className={`badge ${r.approverAction === "APPROVED" ? "GREEN" : "RED"}`}>
                  {r.approverAction === "APPROVED" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}
                </span>
                {r.approverComment && (
                  <div className="field-hint" style={{ marginTop: 4 }}>
                    {r.approverComment}
                  </div>
                )}
              </td>
              <td>{r.approverActionAt ? new Date(r.approverActionAt).toLocaleString("th-TH") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
