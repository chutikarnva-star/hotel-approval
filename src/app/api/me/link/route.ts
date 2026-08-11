import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const employeeCode = body?.employeeCode?.trim();
  if (!employeeCode) {
    return NextResponse.json({ error: "employeeCode is required" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { code: employeeCode } });
  if (!employee) {
    return NextResponse.json({ error: "ไม่พบรหัสพนักงานนี้" }, { status: 404 });
  }
  if (employee.firebaseUid && employee.firebaseUid !== auth.id) {
    return NextResponse.json(
      { error: "รหัสพนักงานนี้ถูกผูกกับบัญชีอื่นไปแล้ว" },
      { status: 409 }
    );
  }

  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { firebaseUid: auth.id, email: auth.email },
    include: { storeCenterBranch: true },
  });

  return NextResponse.json({ employee: updated });
}
