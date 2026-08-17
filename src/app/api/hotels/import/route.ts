import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv, toNumberOrNull } from "@/lib/csv";
import { computeRecommendLevel } from "@/lib/hotelLevel";

// Expected CSV headers: branchCode,name,lat,lng,distanceKm,pricePerNight,note
// Upserts on (branchCode, name) - re-importing the same sheet updates existing rows
// instead of duplicating them.
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
    const branchCode = row.branchCode?.trim();
    const name = row.name?.trim();
    const branchId = branchCode ? branchByCode.get(branchCode) : undefined;

    if (!branchId || !name) {
      errors.push(`Row ${i + 2}: missing name or unknown branchCode "${branchCode}" — import branches first`);
      continue;
    }

    const distanceKm = toNumberOrNull(row.distanceKm);
    const pricePerNight = toNumberOrNull(row.pricePerNight);
    const data = {
      lat: toNumberOrNull(row.lat),
      lng: toNumberOrNull(row.lng),
      distanceKm,
      pricePerNight,
      recommendLevel: computeRecommendLevel(distanceKm, pricePerNight),
      note: row.note?.trim() || null,
    };

    const existing = await prisma.hotel.findUnique({ where: { branchId_name: { branchId, name } } });
    await prisma.hotel.upsert({
      where: { branchId_name: { branchId, name } },
      create: { branchId, name, ...data },
      update: data,
    });
    if (existing) updated++;
    else created++;
  }

  return NextResponse.json({ created, updated, errors });
}
