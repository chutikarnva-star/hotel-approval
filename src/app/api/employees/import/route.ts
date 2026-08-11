import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv, toBool } from "@/lib/csv";
import type { Department } from "@prisma/client";

const VALID_DEPARTMENTS: Department[] = ["AM", "RM", "TN", "Audit"];

// Expected CSV headers: code,name,department,amTeam,codeNickname,storeCenterBranchCode,hasCompanyCar
// storeCenterBranchCode must already exist in Branches - import branches first.
export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = await request.text();
  const rows = parseCsv(text);

  const branches = await prisma.branch.findMany();
  const branchByCode = new Map(branches.map((b) => [b.code, b.id]));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [i, row] of rows.entries()) {
    const code = row.code?.trim();
    const name = row.name?.trim();
    const department = row.department?.trim() as Department;

    if (!code || !name || !VALID_DEPARTMENTS.includes(department)) {
      errors.push(`Row ${i + 2}: missing code/name or invalid department (must be AM/RM/TN/Audit)`);
      continue;
    }

    let storeCenterBranchId: string | undefined;
    const branchCode = row.storeCenterBranchCode?.trim();
    if (branchCode) {
      storeCenterBranchId = branchByCode.get(branchCode);
      if (!storeCenterBranchId) {
        errors.push(`Row ${i + 2}: storeCenterBranchCode "${branchCode}" not found — import branches first`);
        continue;
      }
    }

    const existing = await prisma.employee.findUnique({ where: { code } });
    await prisma.employee.upsert({
      where: { code },
      create: {
        code,
        name,
        department,
        amTeam: row.amTeam?.trim() || null,
        codeNickname: row.codeNickname?.trim() || null,
        storeCenterBranchId,
        hasCompanyCar: toBool(row.hasCompanyCar),
      },
      update: {
        name,
        department,
        amTeam: row.amTeam?.trim() || null,
        codeNickname: row.codeNickname?.trim() || null,
        storeCenterBranchId,
        hasCompanyCar: toBool(row.hasCompanyCar),
      },
    });

    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({ created, updated, errors });
}
