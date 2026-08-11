"use client";

import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import CsvImport from "@/components/CsvImport";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface EmployeeRow {
  id: string;
  code: string;
  name: string;
  department: string;
  hasCompanyCar: boolean;
  email: string | null;
  storeCenterBranch: { code: string; name: string } | null;
}

export default function EmployeesAdminPage() {
  return (
    <AdminGate>
      <div className="container">
        <EmployeesTable />
      </div>
    </AdminGate>
  );
}

function EmployeesTable() {
  const { idToken } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRow[] | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/employees?q=");
    const data = await res.json();
    setEmployees(data.employees);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  return (
    <div>
      <h1>พนักงาน &amp; Store Center</h1>
      <p className="field-hint">นำเข้าสาขา (Branches) ก่อนนำเข้าพนักงาน เพราะต้องอ้างอิงรหัสสาขาของ Store Center</p>
      <CsvImport
        importUrl="/api/employees/import"
        expectedHeaders="code,name,department,amTeam,codeNickname,storeCenterBranchCode,hasCompanyCar"
        onImported={load}
      />
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>รหัสพนักงาน</th>
              <th>ชื่อ</th>
              <th>หน่วยงาน</th>
              <th>Store Center</th>
              <th>มีรถ</th>
              <th>อีเมล (ผูกแล้ว)</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => (
              <tr key={e.id}>
                <td>{e.code}</td>
                <td>{e.name}</td>
                <td>{e.department}</td>
                <td>{e.storeCenterBranch ? `${e.storeCenterBranch.code} - ${e.storeCenterBranch.name}` : "-"}</td>
                <td>{e.hasCompanyCar ? "มี" : "ไม่มี"}</td>
                <td>{e.email ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
