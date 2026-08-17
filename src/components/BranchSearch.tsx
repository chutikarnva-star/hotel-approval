"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import type { BranchLite } from "@/lib/types";

export default function BranchSearch({ onSelect }: { onSelect: (branch: BranchLite) => void }) {
  const { idToken } = useAuth();
  const [rmOptions, setRmOptions] = useState<string[]>([]);
  const [amOptions, setAmOptions] = useState<string[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchLite[]>([]);

  const [rm, setRm] = useState("");
  const [am, setAm] = useState("");
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    apiFetch(idToken, "/api/branches/assignees?type=RM")
      .then((r) => r.json())
      .then((d) => setRmOptions(d.assignees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAm("");
    setAmOptions([]);
    setBranchId("");
    setBranchOptions([]);
    if (!rm) return;
    apiFetch(idToken, `/api/branches/assignees?type=AM&rmAssignee=${encodeURIComponent(rm)}`)
      .then((r) => r.json())
      .then((d) => setAmOptions(d.assignees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rm]);

  useEffect(() => {
    setBranchId("");
    setBranchOptions([]);
    if (!am) return;
    apiFetch(idToken, `/api/branches?assigneeType=AM&assignee=${encodeURIComponent(am)}`)
      .then((r) => r.json())
      .then((d) => setBranchOptions(d.branches ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [am]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div>
        <label>RM</label>
        <select value={rm} onChange={(e) => setRm(e.target.value)}>
          <option value="">เลือก RM...</option>
          {rmOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>AM</label>
        <select value={am} onChange={(e) => setAm(e.target.value)} disabled={!rm}>
          <option value="">เลือก AM...</option>
          {amOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>สาขา</label>
        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            const branch = branchOptions.find((b) => b.id === e.target.value);
            if (branch) onSelect(branch);
          }}
          disabled={!am}
        >
          <option value="">เลือกสาขา...</option>
          {branchOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
