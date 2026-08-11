"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import type { BranchLite } from "@/lib/types";

export default function BranchSearch({
  onSelect,
  placeholder,
}: {
  onSelect: (branch: BranchLite) => void;
  placeholder?: string;
}) {
  const { idToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BranchLite[]>([]);
  const [open, setOpen] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    const res = await apiFetch(idToken, `/api/branches?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.branches);
      setOpen(true);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder={placeholder ?? "ค้นหาสาขา..."}
        value={query}
        onChange={(e) => search(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div
          className="card"
          style={{
            position: "absolute",
            zIndex: 10,
            width: "100%",
            maxHeight: 260,
            overflowY: "auto",
            marginTop: 4,
            padding: 6,
          }}
        >
          {results.map((b) => (
            <div
              key={b.id}
              style={{ padding: "8px 10px", cursor: "pointer", borderRadius: 6 }}
              onMouseDown={() => {
                onSelect(b);
                setQuery(`${b.code} - ${b.name}`);
                setOpen(false);
              }}
            >
              <strong>{b.code}</strong> - {b.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
