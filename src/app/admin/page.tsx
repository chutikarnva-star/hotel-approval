"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminGate from "@/components/AdminGate";
import CsvImport from "@/components/CsvImport";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface ImportSummary {
  created: number;
  updated: number;
  errors: string[];
}

interface SyncResult {
  branches: ImportSummary;
  employees: ImportSummary;
  hotels: ImportSummary;
  approvers: ImportSummary;
}

const ENTITY_LABELS: Record<keyof SyncResult, string> = {
  branches: "สาขา",
  employees: "พนักงาน",
  hotels: "โรงแรม",
  approvers: "ผู้อนุมัติ",
};

export default function AdminHome() {
  return (
    <AdminGate>
      <div className="container">
        <h1>ข้อมูลอ้างอิง (Admin)</h1>
        <Suspense fallback={<div className="card">กำลังโหลด...</div>}>
          <GoogleSheetSync />
        </Suspense>
        <CsvImport
          importUrl="/api/admin/choowap-import"
          title="เลขที่การจอง Choowap"
          hint='อัปโหลดไฟล์รายงาน .xls ที่ export จาก Choowap ตรงๆ ได้เลย ระบบจะดึง "เลขที่การจอง" มาใส่ในคำขอที่รอผลอัตโนมัติ (จับคู่ด้วยรหัสพนักงาน + วันเวลาที่จองที่กรอกไว้)'
          accept=".xls,.csv,.txt"
          onImported={() => {}}
        />
        <div className="card">
          <p><Link href="/admin/branches">สาขา &amp; งบต่อคืน</Link></p>
          <p><Link href="/admin/hotels">Master List โรงแรม</Link></p>
          <p><Link href="/admin/employees">พนักงาน &amp; Store Center</Link></p>
          <p><Link href="/admin/approvers">ผู้อนุมัติ</Link></p>
          <p><Link href="/admin/reports">รายงานความถี่การจอง</Link></p>
        </div>
      </div>
    </AdminGate>
  );
}

function GoogleSheetSync() {
  const { idToken } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function loadStatus() {
    if (!idToken) return;
    const res = await apiFetch(idToken, "/api/admin/sheets/status");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    loadStatus();
    const connected = searchParams.get("sheetsConnected");
    const error = searchParams.get("sheetsError");
    if (connected) setNotice(`เชื่อมต่อ Google Sheet สำเร็จ (${connected})`);
    if (error) setNotice(`เชื่อมต่อไม่สำเร็จ: ${error}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  async function connect() {
    if (!idToken) return;
    const res = await apiFetch(idToken, "/api/admin/sheets/connect");
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      window.location.href = data.url;
    } else {
      setNotice(`เชื่อมต่อไม่สำเร็จ: ${data?.error ?? "unknown error"}`);
    }
  }

  async function sync() {
    if (!idToken) return;
    setBusy(true);
    setResult(null);
    setNotice(null);
    const res = await apiFetch(idToken, "/api/admin/sheets/sync", { method: "POST" });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok) {
      setResult(data);
    } else {
      setNotice(`ซิงก์ไม่สำเร็จ: ${data?.error ?? "unknown error"}`);
    }
  }

  return (
    <div className="card">
      <h3>Google Sheet</h3>
      {notice && <p>{notice}</p>}
      {status?.connected ? (
        <p>
          เชื่อมต่อแล้ว: {status.email}{" "}
          <button className="btn secondary" onClick={connect}>เชื่อมต่อบัญชีอื่น</button>
        </p>
      ) : (
        <p>
          ยังไม่ได้เชื่อมต่อ{" "}
          <button className="btn" onClick={connect}>เชื่อมต่อ Google Sheet</button>
        </p>
      )}
      <button className="btn" disabled={!status?.connected || busy} onClick={sync} style={{ marginTop: 10 }}>
        {busy ? "กำลังซิงก์..." : "ซิงก์ข้อมูลจาก Google Sheet"}
      </button>
      {result && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {(Object.keys(ENTITY_LABELS) as (keyof SyncResult)[]).map((key) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <strong>{ENTITY_LABELS[key]}</strong>: สร้างใหม่ {result[key].created}, อัปเดต {result[key].updated}
              {result[key].errors.length > 0 && (
                <ul style={{ color: "var(--red)" }}>
                  {result[key].errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
