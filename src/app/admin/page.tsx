"use client";

import Link from "next/link";
import AdminGate from "@/components/AdminGate";

export default function AdminHome() {
  return (
    <AdminGate>
      <div className="container">
        <h1>ข้อมูลอ้างอิง (Admin)</h1>
        <div className="card">
          <p><Link href="/admin/branches">สาขา &amp; งบต่อคืน</Link></p>
          <p><Link href="/admin/hotels">Master List โรงแรม</Link></p>
          <p><Link href="/admin/employees">พนักงาน &amp; Store Center</Link></p>
          <p><Link href="/admin/approvers">ผู้อนุมัติ</Link></p>
        </div>
      </div>
    </AdminGate>
  );
}
