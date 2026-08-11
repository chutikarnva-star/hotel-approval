"use client";

import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import CsvImport from "@/components/CsvImport";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface BranchRow {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  budgetPerNight: number;
  isNewBranch: boolean;
}

export default function BranchesAdminPage() {
  return (
    <AdminGate>
      <div className="container">
        <BranchesTable />
      </div>
    </AdminGate>
  );
}

function BranchesTable() {
  const { idToken } = useAuth();
  const [branches, setBranches] = useState<BranchRow[] | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/branches?q=");
    const data = await res.json();
    setBranches(data.branches);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  return (
    <div>
      <h1>สาขา &amp; งบต่อคืน</h1>
      <CsvImport
        importUrl="/api/branches/import"
        expectedHeaders="code,name,lat,lng,budgetPerNight,isNewBranch,openDate"
        onImported={load}
      />
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>รหัสสาขา</th>
              <th>ชื่อสาขา</th>
              <th>Lat</th>
              <th>Long</th>
              <th>งบ/คืน</th>
              <th>สาขาใหม่?</th>
            </tr>
          </thead>
          <tbody>
            {branches?.map((b) => (
              <tr key={b.id}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.lat}</td>
                <td>{b.lng}</td>
                <td>{b.budgetPerNight}</td>
                <td>{b.isNewBranch ? "Y" : "N"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
