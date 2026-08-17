"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";
import TopBar from "./TopBar";

// Deliberately does not go through AuthGate: AuthGate requires linking to an
// existing Employee record before showing any page, which would make /admin
// unreachable on a fresh database with no employees imported yet. Admin
// access only depends on ADMIN_EMAILS (isAdminEmail), not on being a linked
// employee.
export default function AdminGate({ children }: { children: ReactNode }) {
  const { loading: authLoading, user, signIn } = useAuth();
  const { loading: meLoading, isAdmin } = useMe();

  if (authLoading || (user && meLoading)) {
    return <div className="container">กำลังโหลด...</div>;
  }

  if (!user) {
    return (
      <div className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <h1>ระบบขออนุมัติที่พัก</h1>
        <button className="btn" onClick={signIn} style={{ marginTop: 24 }}>
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="container">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <>
      <TopBar />
      {children}
    </>
  );
}
