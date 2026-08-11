import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const approver = await prisma.approver.findFirst({ where: { email: auth.email } });
  if (!approver) {
    return NextResponse.json({ error: "บัญชีนี้ไม่ได้ถูกกำหนดให้เป็นผู้อนุมัติ" }, { status: 403 });
  }

  const requests = await prisma.request.findMany({
    where: { approverId: approver.id },
    include: { destinationBranch: true, selectedHotel: true, employee: true },
    orderBy: { createdAt: "desc" },
  });

  const summary = {
    total: requests.length,
    green: requests.filter((r) => r.statusFlag === "GREEN").length,
    yellow: requests.filter((r) => r.statusFlag === "YELLOW").length,
    red: requests.filter((r) => r.statusFlag === "RED").length,
    pending: requests.filter((r) => r.approverAction === "PENDING").length,
  };

  return NextResponse.json({ approver, requests, summary });
}
