import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import type { Department } from "@prisma/client";

const VALID_DEPARTMENTS: Department[] = ["AM", "RM", "TN", "Audit"];

// Expected CSV headers: department,nickname,fullName,email
export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = await request.text();
  const rows = parseCsv(text);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [i, row] of rows.entries()) {
    const department = row.department?.trim() as Department;
    const nickname = row.nickname?.trim();

    if (!VALID_DEPARTMENTS.includes(department) || !nickname) {
      errors.push(`Row ${i + 2}: invalid department (must be AM/RM/TN/Audit) or missing nickname`);
      continue;
    }

    const existing = await prisma.approver.findUnique({ where: { department } });
    await prisma.approver.upsert({
      where: { department },
      create: {
        department,
        nickname,
        fullName: row.fullName?.trim() || null,
        email: row.email?.trim() || null,
      },
      update: {
        nickname,
        fullName: row.fullName?.trim() || null,
        email: row.email?.trim() || null,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({ created, updated, errors });
}
