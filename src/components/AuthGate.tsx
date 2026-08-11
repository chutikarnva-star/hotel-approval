"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiFetch";
import TopBar from "./TopBar";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { loading: authLoading, user, idToken, signIn } = useAuth();
  const { loading: meLoading, employee, refresh } = useMe();

  if (authLoading || (user && meLoading)) {
    return <div className="container">กำลังโหลด...</div>;
  }

  if (!user) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h1>ระบบขออนุมัติที่พัก</h1>
        <p style={{ color: "var(--muted)" }}>สำหรับพนักงานที่ไปทำงานสาขาไกล Store Center</p>
        <button className="btn" onClick={signIn} style={{ marginTop: 24 }}>
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    );
  }

  if (!employee) {
    return <LinkEmployee idToken={idToken} onLinked={refresh} />;
  }

  return (
    <>
      <TopBar />
      {children}
    </>
  );
}

function LinkEmployee({ idToken, onLinked }: { idToken: string | null; onLinked: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; code: string; name: string; department: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await apiFetch(idToken, `/api/employees?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.employees);
    }
  }

  async function link(code: string) {
    setLinking(true);
    setError(null);
    const res = await apiFetch(idToken, "/api/me/link", {
      method: "POST",
      body: JSON.stringify({ employeeCode: code }),
    });
    setLinking(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    onLinked();
  }

  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 60 }}>
      <div className="card">
        <h2>ยืนยันชื่อพนักงาน</h2>
        <p className="field-hint">ค้นหาชื่อหรือรหัสพนักงานของคุณเพื่อผูกกับบัญชี Google นี้ (ทำครั้งเดียว)</p>
        <input
          placeholder="พิมพ์ชื่อหรือรหัสพนักงาน..."
          value={query}
          onChange={(e) => search(e.target.value)}
        />
        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
        <div style={{ marginTop: 12 }}>
          {results.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => !linking && link(r.code)}
            >
              <div>
                <strong>{r.name}</strong>
                <div className="field-hint">{r.code} · {r.department}</div>
              </div>
              <span className="btn secondary">เลือก</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
