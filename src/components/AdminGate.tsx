"use client";

import type { ReactNode } from "react";
import AuthGate from "./AuthGate";
import { useMe } from "@/lib/useMe";

export default function AdminGate({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AdminCheck>{children}</AdminCheck>
    </AuthGate>
  );
}

function AdminCheck({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useMe();
  if (loading) return <div className="container">กำลังโหลด...</div>;
  if (!isAdmin) return <div className="container">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  return <>{children}</>;
}
