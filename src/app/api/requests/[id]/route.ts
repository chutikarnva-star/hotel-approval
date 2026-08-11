import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/currentEmployee";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const found = await prisma.request.findUnique({
    where: { id: params.id },
    include: {
      destinationBranch: true,
      storeCenterBranch: true,
      selectedHotel: true,
      approver: true,
      employee: true,
    },
  });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const employee = await getCurrentEmployee(auth);
  const approver = await prisma.approver.findFirst({ where: { email: auth.email } });

  const isOwner = employee && found.employeeId === employee.id;
  const isApproverForThis = approver && approver.id === found.approverId;

  if (!isOwner && !isApproverForThis) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request: found });
}
