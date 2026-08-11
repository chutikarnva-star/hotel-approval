"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "./apiFetch";

export interface MeEmployee {
  id: string;
  code: string;
  name: string;
  department: "AM" | "RM" | "TN" | "Audit";
  hasCompanyCar: boolean;
  storeCenterBranch: { code: string; name: string } | null;
}

interface MeState {
  loading: boolean;
  employee: MeEmployee | null;
  approverDepartment: string | null;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

const MeContext = createContext<MeState | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const { idToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<MeEmployee | null>(null);
  const [approverDepartment, setApproverDepartment] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    if (!idToken) {
      setEmployee(null);
      setApproverDepartment(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiFetch(idToken, "/api/me");
    if (res.ok) {
      const data = await res.json();
      setEmployee(data.employee);
      setApproverDepartment(data.approverDepartment);
      setIsAdmin(data.isAdmin);
    }
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <MeContext.Provider value={{ loading, employee, approverDepartment, isAdmin, refresh }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeState {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within MeProvider");
  return ctx;
}
