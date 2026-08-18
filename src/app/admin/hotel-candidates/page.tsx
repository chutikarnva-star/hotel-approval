"use client";

import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface Candidate {
  branchId: string;
  branchCode: string;
  branchName: string;
  hotelName: string;
  requestCount: number;
  latestPricePerNight: number | null;
  latestRequestDate: string | null;
}

export default function HotelCandidatesPage() {
  return (
    <AdminGate>
      <div className="container">
        <HotelCandidatesList />
      </div>
    </AdminGate>
  );
}

function HotelCandidatesList() {
  const { idToken } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/admin/hotel-candidates");
    if (res.ok) {
      const data = await res.json();
      setCandidates(data.candidates);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  async function dismiss(branchId: string, hotelName: string) {
    const key = `${branchId}::${hotelName}`;
    setBusyKey(key);
    await apiFetch(idToken, "/api/admin/hotel-candidates/dismiss", {
      method: "POST",
      body: JSON.stringify({ branchId, hotelName }),
    });
    setBusyKey(null);
    load();
  }

  return (
    <div>
      <h1>โรงแรมใหม่รอตรวจสอบ</h1>
      <p className="field-hint">
        รายชื่อโรงแรมที่พนักงานพิมพ์เองตอนเลือก &quot;โรงแรมอื่นที่ไม่อยู่ใน Master List&quot; —
        เช็คแล้วเพิ่มเข้า Master List ในชีต หรือเพิ่มเข้าระบบผ่านหน้า{" "}
        <a href="/admin/hotels">Master List โรงแรม</a> เอง จากนั้นกด &quot;จัดการแล้ว&quot; เพื่อเอาออกจากรายการนี้
      </p>

      {candidates?.length === 0 && <p className="field-hint">ไม่มีรายการรอตรวจสอบ</p>}

      {candidates && candidates.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>สาขา</th>
                <th>ชื่อโรงแรมที่พนักงานกรอก</th>
                <th>จำนวนครั้งที่ขอ</th>
                <th>ราคาล่าสุดที่กรอก</th>
                <th>ขอครั้งล่าสุด</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const key = `${c.branchId}::${c.hotelName}`;
                return (
                  <tr key={key}>
                    <td>{c.branchCode} - {c.branchName}</td>
                    <td>{c.hotelName}</td>
                    <td>{c.requestCount}</td>
                    <td>{c.latestPricePerNight ?? "-"}</td>
                    <td>{c.latestRequestDate ? new Date(c.latestRequestDate).toLocaleDateString("th-TH") : "-"}</td>
                    <td>
                      <button
                        className="btn secondary"
                        disabled={busyKey === key}
                        onClick={() => dismiss(c.branchId, c.hotelName)}
                      >
                        จัดการแล้ว
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
