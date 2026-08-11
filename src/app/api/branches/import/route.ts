import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv, toBool, toNumberOrNull } from "@/lib/csv";

// Expected CSV headers: code,name,lat,lng,budgetPerNight,isNewBranch,openDate
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
    const code = row.code?.trim();
    const name = row.name?.trim();
    const lat = toNumberOrNull(row.lat);
    const lng = toNumberOrNull(row.lng);

    if (!code || !name || lat == null || lng == null) {
      errors.push(`Row ${i + 2}: missing code/name/lat/lng`);
      continue;
    }

    const existing = await prisma.branch.findUnique({ where: { code } });
    await prisma.branch.upsert({
      where: { code },
      create: {
        code,
        name,
        lat,
        lng,
        budgetPerNight: toNumberOrNull(row.budgetPerNight) ?? 560,
        isNewBranch: toBool(row.isNewBranch),
        openDate: row.openDate ? new Date(row.openDate) : null,
      },
      update: {
        name,
        lat,
        lng,
        budgetPerNight: toNumberOrNull(row.budgetPerNight) ?? undefined,
        isNewBranch: toBool(row.isNewBranch),
        openDate: row.openDate ? new Date(row.openDate) : null,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({ created, updated, errors });
}
