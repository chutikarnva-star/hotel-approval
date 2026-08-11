"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface RequestRow {
  id: string;
  requestCode: string;
  requestDate: string;
  destinationBranch: { name: string };
  selectedHotel: { name: string } | null;
  otherHotelName: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  statusFlag: "GREEN" | "YELLOW" | "RED" | null;
  approverAction: "PENDING" | "APPROVED" | "REJECTED";
}

export default function RequestsPage() {
  return (
    <AuthGate>
      <div className="container">
        <RequestsList />
      </div>
    </AuthGate>
  );
}

function RequestsList() {
  const { idToken } = useAuth();
  const [requests, setRequests] = useState<RequestRow[] | null>(null);

  useEffect(() => {
    apiFetch(idToken, "/api/requests")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests));
  }, [idToken]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>คำขอที่พักของฉัน</h1>
        <Link href="/requests/new" className="btn">+ ขอจองที่พักใหม่</Link>
      </div>

      {requests === null && <p>กำลังโหลด...</p>}
      {requests?.length === 0 && <p className="field-hint">ยังไม่มีคำขอ</p>}

      {requests?.map((r) => (
        <div key={r.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{r.requestCode}</strong>
            {r.statusFlag && <span className={`badge ${r.statusFlag}`}>{r.statusFlag}</span>}
          </div>
          <p style={{ margin: "6px 0" }}>
            สาขา: {r.destinationBranch.name}
            <br />
            โรงแรม: {r.selectedHotel?.name ?? r.otherHotelName ?? "-"}
            <br />
            เข้าพัก {r.checkInDate?.slice(0, 10)} — {r.checkOutDate?.slice(0, 10)}
          </p>
          <span className="field-hint">สถานะอนุมัติ: {approvalLabel(r.approverAction)}</span>
        </div>
      ))}
    </div>
  );
}

function approvalLabel(action: string) {
  if (action === "APPROVED") return "อนุมัติแล้ว";
  if (action === "REJECTED") return "ไม่อนุมัติ";
  return "รออนุมัติ";
}
