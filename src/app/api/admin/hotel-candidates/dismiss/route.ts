import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.branchId || !body?.hotelName) {
    return NextResponse.json({ error: "branchId, hotelName are required" }, { status: 400 });
  }

  await prisma.hotelCandidateReview.upsert({
    where: { branchId_hotelName: { branchId: body.branchId, hotelName: body.hotelName } },
    create: { branchId: body.branchId, hotelName: body.hotelName, dismissed: true },
    update: { dismissed: true, reviewedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
