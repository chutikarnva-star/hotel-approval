import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseChoowapWorkbook, matchBooking } from "@/lib/choowapImport";

// Upload target for the "Report-CJMart-*.xls" export from Choowap (see
// src/lib/choowapImport.ts for the format). Backfills Request.choowapBookingCode
// for any request the employee already recorded a choowapBookedAt timestamp for
// but that hasn't been reconciled with a real booking number yet.
export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const xml = await request.text();
  const rows = parseChoowapWorkbook(xml);
  if (rows.length === 0) {
    return NextResponse.json({ error: "ไม่พบข้อมูลที่อ่านได้ในไฟล์นี้ — ตรวจสอบว่าเป็นไฟล์ export จาก Choowap" }, { status: 400 });
  }

  const pending = await prisma.request.findMany({
    where: { choowapBookingCode: null, choowapBookedAt: { not: null } },
    select: { id: true, requestCode: true, choowapBookedAt: true, employee: { select: { code: true, name: true } } },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const req of pending) {
    const result = matchBooking(rows, req.employee.code, req.choowapBookedAt!);
    if (result.ambiguous) {
      errors.push(`${req.requestCode} (${req.employee.name}): พบมากกว่า 1 การจองที่ตรงกัน — กรุณาตรวจสอบด้วยตนเอง`);
      continue;
    }
    if (!result.bookingNo) continue;

    await prisma.request.update({
      where: { id: req.id },
      data: { choowapBookingCode: result.bookingNo },
    });
    updated++;
  }

  return NextResponse.json({ updated, errors });
}
