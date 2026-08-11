import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Department } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const approvers = await prisma.approver.findMany({ orderBy: { department: "asc" } });
  return NextResponse.json({ approvers });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  if (!body?.department || !body?.nickname) {
    return NextResponse.json({ error: "department, nickname are required" }, { status: 400 });
  }

  const approver = await prisma.approver.upsert({
    where: { department: body.department as Department },
    create: {
      department: body.department as Department,
      nickname: body.nickname,
      fullName: body.fullName ?? null,
      email: body.email ?? null,
    },
    update: {
      nickname: body.nickname,
      fullName: body.fullName ?? null,
      email: body.email ?? null,
    },
  });

  return NextResponse.json({ approver }, { status: 201 });
}
