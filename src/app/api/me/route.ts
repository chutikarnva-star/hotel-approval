import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const employee = await prisma.employee.findFirst({
    where: { OR: [{ email: auth.email }, { firebaseUid: auth.id }] },
    include: { storeCenterBranch: true },
  });

  const approver = await prisma.approver.findFirst({
    where: { email: auth.email },
  });

  return NextResponse.json({
    email: auth.email,
    employee,
    approverDepartment: approver?.department ?? null,
    isAdmin: isAdminEmail(auth.email),
  });
}
