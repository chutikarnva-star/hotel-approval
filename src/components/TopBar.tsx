"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";

export default function TopBar() {
  const { user, signOutUser } = useAuth();
  const { employee, approverDepartment, isAdmin } = useMe();
  const pathname = usePathname();

  function navLink(href: string, label: string) {
    const isActive = pathname === href || (href !== "/requests" && pathname?.startsWith(href));
    return (
      <Link href={href} className={isActive ? "active" : ""}>
        {label}
      </Link>
    );
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="mark" aria-hidden>🏨</span>
        <span>จองที่พัก</span>
      </div>
      <nav>
        {navLink("/requests", "คำขอของฉัน")}
        {approverDepartment && navLink("/approvals", `รออนุมัติ (${approverDepartment})`)}
        {isAdmin && navLink("/admin", "Admin")}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
        <span style={{ color: "var(--muted)" }}>{employee?.name ?? user?.email}</span>
        <button className="btn secondary" onClick={signOutUser}>ออกจากระบบ</button>
      </div>
    </div>
  );
}
