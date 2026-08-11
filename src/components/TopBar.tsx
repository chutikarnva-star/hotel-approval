"use client";

import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";

export default function TopBar() {
  const { user, signOutUser } = useAuth();
  const { employee, approverDepartment, isAdmin } = useMe();

  return (
    <div className="topbar">
      <nav>
        <Link href="/requests">คำขอของฉัน</Link>
        {approverDepartment && <Link href="/approvals">รออนุมัติ ({approverDepartment})</Link>}
        {isAdmin && <Link href="/admin">Admin</Link>}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
        <span style={{ color: "var(--muted)" }}>{employee?.name ?? user?.email}</span>
        <button className="btn secondary" onClick={signOutUser}>ออกจากระบบ</button>
      </div>
    </div>
  );
}
