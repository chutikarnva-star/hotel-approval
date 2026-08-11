import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Department } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const employees = await prisma.employee.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { storeCenterBranch: true },
    orderBy: { name: "asc" },
    take: q ? 50 : 500,
  });

  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body?.code || !body?.name || !body?.department) {
    return NextResponse.json({ error: "code, name, department are required" }, { status: 400 });
  }

  let storeCenterBranchId: string | undefined;
  if (body.storeCenterBranchCode) {
    const branch = await prisma.branch.findUnique({ where: { code: body.storeCenterBranchCode } });
    if (!branch) {
      return NextResponse.json({ error: "ไม่พบ Store Center branch code นี้" }, { status: 400 });
    }
    storeCenterBranchId = branch.id;
  }

  const employee = await prisma.employee.upsert({
    where: { code: body.code },
    create: {
      code: body.code,
      name: body.name,
      department: body.department as Department,
      amTeam: body.amTeam ?? null,
      codeNickname: body.codeNickname ?? null,
      storeCenterBranchId,
      hasCompanyCar: Boolean(body.hasCompanyCar),
    },
    update: {
      name: body.name,
      department: body.department as Department,
      amTeam: body.amTeam ?? null,
      codeNickname: body.codeNickname ?? null,
      storeCenterBranchId,
      hasCompanyCar: Boolean(body.hasCompanyCar),
    },
  });

  return NextResponse.json({ employee }, { status: 201 });
}
