"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

export default function CsvImport({
  importUrl,
  expectedHeaders,
  onImported,
  title = "นำเข้าจาก CSV",
  accept = ".csv",
  hint,
}: {
  importUrl: string;
  expectedHeaders?: string;
  onImported: () => void;
  title?: string;
  accept?: string;
  hint?: string;
}) {
  const { idToken } = useAuth();
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created?: number; updated?: number; errors: string[] } | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setCsvText(text);
  }

  async function submit() {
    setBusy(true);
    setResult(null);
    const res = await apiFetch(idToken, importUrl, {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csvText,
    });
    const data = await res.json().catch(() => ({ errors: ["upload failed"] }));
    setBusy(false);
    setResult(data);
    if (res.ok) onImported();
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="field-hint">{hint ?? `คอลัมน์ที่ต้องมี: ${expectedHeaders}`}</p>
      <input type="file" accept={accept} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <textarea
        rows={6}
        placeholder="หรือวางเนื้อหา CSV ที่นี่"
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />
      <button className="btn" disabled={!csvText.trim() || busy} onClick={submit} style={{ marginTop: 10 }}>
        {busy ? "กำลังนำเข้า..." : "นำเข้า"}
      </button>
      {result && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {result.created != null && <p>สร้างใหม่: {result.created}</p>}
          {result.updated != null && <p>อัปเดต: {result.updated}</p>}
          {result.errors.length > 0 && (
            <ul style={{ color: "var(--red)" }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
