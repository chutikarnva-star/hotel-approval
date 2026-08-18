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
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: 120, color: "var(--muted)" }}>
        กำลังโหลด...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 96 }}>
        <div className="card" style={{ maxWidth: 380, textAlign: "center", padding: "40px 32px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              margin: "0 auto 18px",
            }}
            aria-hidden
          >
            🏨
          </div>
          <h1 style={{ fontSize: 21 }}>ระบบขออนุมัติที่พัก</h1>
          <p style={{ color: "var(--muted)", marginTop: 6 }}>
            สำหรับพนักงานที่ไปทำงานสาขาไกลจากสาขาใกล้บ้าน
          </p>
          <button
            className="btn secondary"
            onClick={signIn}
            style={{ width: "100%", marginTop: 28, justifyContent: "center" }}
          >
            <GoogleIcon />
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
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
              className="card clickable"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
