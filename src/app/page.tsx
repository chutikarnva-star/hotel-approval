"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";

export default function Home() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { loading: meLoading, approverDepartment } = useMe();

  useEffect(() => {
    if (authLoading || (user && meLoading)) return;
    router.replace(approverDepartment ? "/approvals" : "/requests");
  }, [authLoading, meLoading, user, approverDepartment, router]);

  return null;
}
