import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const approver = await prisma.approver.findFirst({ where: { email: auth.email } });
  if (!approver) {
    return NextResponse.json({ error: "บัญชีนี้ไม่ได้ถูกกำหนดให้เป็นผู้อนุมัติ" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "APPROVED" && action !== "REJECTED") {
    return NextResponse.json({ error: "action must be APPROVED or REJECTED" }, { status: 400 });
  }
  if (action === "REJECTED" && !body?.comment?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" }, { status: 400 });
  }

  const found = await prisma.request.findUnique({ where: { id: params.id } });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.approverId !== approver.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: {
      approverAction: action,
      approverComment: body?.comment?.trim() || null,
      approverActionAt: new Date(),
    },
  });

  return NextResponse.json({ request: updated });
}
