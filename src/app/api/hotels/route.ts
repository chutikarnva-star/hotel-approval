import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRecommendLevel } from "@/lib/hotelLevel";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const branchCode = searchParams.get("branchCode")?.trim();

  const hotels = await prisma.hotel.findMany({
    where: branchCode ? { branch: { code: branchCode } } : undefined,
    include: { branch: true },
    orderBy: [{ recommendLevel: "asc" }, { distanceKm: "asc" }],
  });

  return NextResponse.json({ hotels });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body?.branchCode || !body?.name) {
    return NextResponse.json({ error: "branchCode, name are required" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({ where: { code: body.branchCode } });
  if (!branch) {
    return NextResponse.json({ error: "ไม่พบสาขานี้" }, { status: 400 });
  }

  const distanceKm = body.distanceKm != null ? Number(body.distanceKm) : null;
  const pricePerNight = body.pricePerNight != null ? Number(body.pricePerNight) : null;

  const hotel = await prisma.hotel.create({
    data: {
      branchId: branch.id,
      name: body.name,
      lat: body.lat != null ? Number(body.lat) : null,
      lng: body.lng != null ? Number(body.lng) : null,
      distanceKm,
      pricePerNight,
      recommendLevel: computeRecommendLevel(distanceKm, pricePerNight),
      note: body.note ?? null,
    },
  });

  return NextResponse.json({ hotel }, { status: 201 });
}
