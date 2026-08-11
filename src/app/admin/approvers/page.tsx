"use client";

import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import CsvImport from "@/components/CsvImport";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface ApproverRow {
  id: string;
  department: string;
  nickname: string;
  fullName: string | null;
  email: string | null;
}

export default function ApproversAdminPage() {
  return (
    <AdminGate>
      <div className="container">
        <ApproversTable />
      </div>
    </AdminGate>
  );
}

function ApproversTable() {
  const { idToken } = useAuth();
  const [approvers, setApprovers] = useState<ApproverRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/approvers");
    const data = await res.json();
    setApprovers(data.approvers);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  async function saveEmail(a: ApproverRow) {
    setSavingId(a.id);
    await apiFetch(idToken, "/api/approvers", {
      method: "POST",
      body: JSON.stringify({
        department: a.department,
        nickname: a.nickname,
        fullName: a.fullName,
        email: drafts[a.id] ?? a.email,
      }),
    });
    setSavingId(null);
    load();
  }

  return (
    <div>
      <h1>ผู้อนุมัติ</h1>
      <p className="field-hint">
        ตอนนี้แอปแจ้งเตือนผู้อนุมัติในแอปเท่านั้น (ผู้อนุมัติต้อง login มาดูเอง) — ใส่อีเมลที่นี่เมื่อพร้อมผูกบัญชี login ของผู้อนุมัติแต่ละหน่วยงาน
      </p>
      <CsvImport
        importUrl="/api/approvers/import"
        expectedHeaders="department,nickname,fullName,email"
        onImported={load}
      />
      <div className="card">
        {approvers?.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 70, fontWeight: 700 }}>{a.department}</div>
            <div style={{ width: 100 }}>{a.nickname}</div>
            <input
              placeholder="อีเมลผู้อนุมัติ (@cjmart.co.th)"
              defaultValue={a.email ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
              style={{ marginTop: 0 }}
            />
            <button className="btn secondary" disabled={savingId === a.id} onClick={() => saveEmail(a)}>
              บันทึก
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
