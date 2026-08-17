import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const assigneeType = searchParams.get("assigneeType");
  const assignee = searchParams.get("assignee")?.trim();

  const where: Prisma.BranchWhereInput = {};
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (assignee && assigneeType === "RM") {
    where.rmAssignee = assignee;
  } else if (assignee && assigneeType === "AM") {
    where.amAssignee = assignee;
  }

  const branches = await prisma.branch.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { name: "asc" },
    take: q ? 50 : 500,
  });

  return NextResponse.json({ branches });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body?.code || !body?.name || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: "code, name, lat, lng are required" }, { status: 400 });
  }

  const branch = await prisma.branch.upsert({
    where: { code: body.code },
    create: {
      code: body.code,
      name: body.name,
      lat: Number(body.lat),
      lng: Number(body.lng),
      budgetPerNight: body.budgetPerNight != null ? Number(body.budgetPerNight) : 560,
      isNewBranch: Boolean(body.isNewBranch),
      openDate: body.openDate ? new Date(body.openDate) : null,
    },
    update: {
      name: body.name,
      lat: Number(body.lat),
      lng: Number(body.lng),
      budgetPerNight: body.budgetPerNight != null ? Number(body.budgetPerNight) : undefined,
      isNewBranch: body.isNewBranch != null ? Boolean(body.isNewBranch) : undefined,
      openDate: body.openDate ? new Date(body.openDate) : undefined,
    },
  });

  return NextResponse.json({ branch }, { status: 201 });
}
